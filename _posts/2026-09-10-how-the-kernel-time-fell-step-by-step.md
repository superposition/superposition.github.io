---
title: "How the kernel time fell, step by step"
description: Three measured steps took the Rust matrix multiply from 344 to 80 microseconds and layer normalization from 18.6 to 10.1 — and the steps that carried the reduction were a change of layout and a change of work split, not of arithmetic.
date: 2026-09-10 16:30:00 -0400
updated: 2026-09-11
tags: [kernels, measurement, performance]
experiment_id: mage-003
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-003.md
math: true
mesh_band: true
---
<figure class="mesh-band" data-colors="#c9b2ff,#93caff,#91dbba" data-weights="1,0.73,0.45">
  <canvas aria-hidden="true" focusable="false"></canvas>
  <figcaption>
    <p>The three spots are the three steps, opacity set by that step's speed-up.</p>
    <span class="mesh-band-credit">Field: <a href="https://github.com/paper-design/shaders" rel="noopener">Paper Shaders</a> mesh gradient (Apache-2.0), palette and weights from this post.</span>
  </figcaption>
</figure>
**The claim.** Two Rust kernels went from $343.99$ to $80.00\ \mu s$ and from $18.64$ to $10.05\ \mu s$ of GPU
kernel time, and the steps that carried the reduction changed where the data sits and which threads read it,
not how much arithmetic runs. Reading a thread's operands as 128-bit quads cut shared-memory reads per
multiply-add from $\tfrac{8}{16} = 0.5$ to $\tfrac{2}{16} = 0.125$; splitting each row between two warps asked
the same 128 streaming multiprocessors for twice the threads.

## The matrix multiply was reading too often, not computing too much

Each thread owns a $4 \times 4$ block of $C$ and does sixteen multiply-adds per contraction step, so the
loop's real question is how often it goes to shared memory: the retained build goes eight times —
$\tfrac{8}{16} = 0.5$ reads per multiply-add. Counters are unavailable on this host, so the count was tested
rather than read. A deliberately worse build — $32 \times 32$ block tiles, a $2 \times 4$ register tile, six
reads for eight multiply-adds, $\tfrac{6}{8} = 0.75$ — should be $1.5\times$ slower if shared-memory load
instructions are the limit. Same session, it was $1.44\times$: 210.51 against $145.61\ \mu s$. Both builds
issue the same multiply-adds, so the ratio tracks the reads.

Three steps then removed read instructions: the $B$ tile read as one 128-bit quad (145.6 → **114.9 µs**), the
$A$ tile stored transposed and k-major so the four rows a thread owns are contiguous and one load fetches
them (→ **89.9 µs**), and the contraction step widened from 32 to 64 so the barrier pairs halve
(→ **80.00 µs**). The retained loop reads each operand once, 128 bits at a time, for sixteen multiply-adds,
with shared memory up from 16384 to 33792 bytes and registers from 55 to 56. The first two values are spans
measured by the binary, the third is GPU kernel time.

<div class="measurement">
<figure class="profile-plot">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-004/matmul-layouts-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-004/matmul-layouts.svg' | relative_url }}" width="740" height="278"
         alt="Two schematics. Left, the compiler-chosen tile layout: a grid of 32 by 128 tiles, one program per tile, loading 32 by 32 operands per contraction step as 128-bit loads. Right, the hand-written layout: a 64 by 64 block with a 4 by 4 register tile per thread, shared memory holding A transposed with row stride 68 so each thread's four rows are contiguous.">
  </picture>
  <figcaption>
    <p>Where the two steps on the right-hand side of this note live. The register tile decides how many times the loop reads; the transposed $A$ with a row stride of 68 is what makes the four rows a thread owns one 128-bit load instead of four scattered 32-bit ones. <a href="{{ '/mage/assets/figures/mage-004/matmul-layouts.svg' | relative_url }}" download>Download the SVG</a>.</p>
  </figcaption>
</figure>
</div>

## The layer norm was short of resident threads

The warp kernel launches 512 blocks of 256 threads for 4096 rows — 131072 threads, which over the 4090's 128
SMs is at most 1024 resident per SM against a limit of 1536. The grid is short of the threads that keep loads
in flight, and nothing inside a warp changes how many warps an SM holds. **Two warps per row**, each owning
half of it, doubles the block count to 1024; the halves meet once in 64 bytes of shared memory behind one
barrier, and each warp sums $x$ and $x^2$ in one pass, so the statistics cost one read of the row. 39
registers per thread.

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-003/layernorm-row-split-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-003/layernorm-row-split.svg' | relative_url }}" width="1040" height="430" alt="Two schematics of one 768-float layer-norm row. Left: one warp owns it, 32 lanes reading 24 floats each as six 128-bit quads and reducing with shuffle_down; 512 blocks leave 1024 of each SM's 1536 thread slots filled. Right: two warps own half the row each, reading 12 floats per lane as three quads and summing x and x squared in one pass, their partial sums meeting once in 64 bytes of shared memory behind one barrier, and the same 128 SMs are asked for twice the threads.">
  </picture>
  <figcaption>
    <p>Schematic, not a measurement: the same row and the same 128-bit lane loads, split between two warps instead of one. What changes is how many threads the grid asks an SM to keep resident, and where the two halves' partial sums meet.</p>
  </figcaption>
</figure>

Five runs per build, timed by the binary: one warp per row 13.53–13.76 µs (mean 13.64), two warps 12.53–12.94
µs (mean 12.69). The ranges do not overlap, and that capture session prices the two-warp kernel at 10.05 µs
against 11.03 µs for the kernel it replaces.

## Evidence

One Nsight Systems capture per implementation and operation, 100 iterations each, plus three rounds of 100
warmed CUDA-event samples. The instrument is named per row because it is not one instrument throughout.

| Kernel | Step | Instrument | Value |
| --- | --- | --- | ---: |
| matrix multiply | original: $16\times16$ tiles, one output per thread | GPU kernel time | 343.99 |
| matrix multiply | $4\times4$ outputs per thread, $64\times64$ block tiles, K step 32 (PR #42) | GPU kernel time | 141.70 |
| matrix multiply | the retained $4\times4$ build the next three rows start from | CUDA-event span | 145.61 |
| matrix multiply | the $B$ tile read as one 128-bit quad | CUDA-event span | 114.9 |
| matrix multiply | the $A$ tile stored transposed, k-major, row stride 68 | CUDA-event span | 89.9 |
| matrix multiply | K step 32 → 64, halving the barrier pairs | GPU kernel time | 80.00 |
| layer norm | original: a 256-thread block per row, three passes, two tree reductions | GPU kernel time | 18.64 |
| layer norm | one warp per row, 128-bit quads, shuffle reductions (PR #42) | GPU kernel time | 11.03 |
| layer norm | two warps per row, half a row each, one exchange behind one barrier (PR #44) | GPU kernel time | 10.05 |

*Microseconds. A span can include gaps while the host submits work; kernel time cannot. The 11.03 is the warp
kernel as measured in the third session — the session that published it recorded 11.09, 0.5% away, which is
this harness's resolution.*

Bias + GELU, triangle contraction and neighbor aggregation keep their kernels, and their kernel time moves by
less than 3% between the first and the retained capture (11.21 → 10.97, 81.16 → 80.07, 10.28 → 10.33 µs).
The steps above are an order of magnitude outside that drift.

## What was tried and not kept

Each is a single development measurement with its instrument named, not retained evidence.

- **$32\times32$ tiles with a $2\times4$ register tile**: 210.51 µs span against 145.61 — the experiment that
  identified the limit; not adopted.
- **$8\times4$ register tile on 128-row blocks**: 147.74 µs span against 145.61, inside the few percent this
  harness cannot resolve.
- **Four warps per row**: 13.3–13.7 µs span; doubling again does not help, since two warps already reach the
  resident-thread limit.
- **A row in eight named quad registers**: 13.4–14.0 µs; **a row held in a `[F32x4; 8]` array**: 22.12 µs of
  kernel time against 11.02 for the warp kernel in the same build — it spilled to local memory, which is why
  the row is spread across lanes instead.
- **128-thread blocks for the layer norm** (four rows per block): 14.4 µs span against 12.69.

## What the numbers do not establish

The cuBLAS call behind PyTorch is still ahead: 80.0 µs of kernel time for the matrix multiply against 44.0 µs,
which ranges from 44.03 to 55.96 across the three namespaces. Triton's matrix multiply is not stable between
sessions (83.78, 83.77, 71.94 µs) while the Rust kernel moves from 80.12 to 80.00, so one pairing ranks
nothing. Layer normalization is behind Triton's kernel (10.05 against 7.99) and ahead of both baselines
around the call.

These are fixed FP32 shapes on one WSL workstation with unlocked clocks. No counters were available, so
occupancy, cache behavior and memory throughput are not measured — the residency arithmetic is a limit on
what the grid can hold, not a measurement of what it held. Kernel time comes from a single capture per case
and carries no interval of its own, and the spans are means of 300 warmed samples. Compilation, transfers,
tile tails, lower precision, backward passes and service behavior are outside the measurements.

The [field note](https://superposition.github.io/mage/experiments/mage-003/) has the PyTorch and Triton
columns with the full tables, and the [technical record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-003.md)
has the method and the reproduction commands.
