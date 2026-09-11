---
title: "The load in flight, and the shape Triton uses"
description: "The matrix multiply stopped waiting on its own tile loads — 80.00 to 68.62 µs — and the layer norm was rebuilt in the shape Triton's kernel emits — 10.05 to 8.97 µs. Both changes are the same change: more independent loads in flight."
date: 2026-09-10 20:30:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-006
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-006.md
field_note: https://superposition.github.io/mage/experiments/mage-006/
math: true
mesh_band: true
---
<figure class="mesh-band" data-colors="#91dbba,#c9b2ff,#e0a08a" data-weights="1,0.76,0.13">
  <canvas aria-hidden="true" focusable="false"></canvas>
  <figcaption>
    <p>The three spots are the two rewrites and the drift they have to beat, opacity set by each change's share of the kernel time it started from.</p>
    <span class="mesh-band-credit">Field: <a href="https://github.com/paper-design/shaders" rel="noopener">Paper Shaders</a> mesh gradient (Apache-2.0), palette and weights from this post.</span>
  </figcaption>
</figure>
**The claim.** Both kernels lost the same thing, and neither lost it to arithmetic: neither could
keep a second memory request in flight. The matrix multiply copied each K tile into shared
memory, synchronized the block, and only then multiplied, so **no copy was outstanding while the
multiply-adds ran**; two buffers and an asynchronous copy took it from $80.00$ to
**$68.62\ \mu s$** of GPU kernel time. Layer normalization had nothing to overlap — it read its
row twice, at 39 registers a thread — and rebuilt in the shape Triton's generated code uses it
went from $10.05$ to **$8.97\ \mu s$**. The multiply now beats every Triton matrix-multiply
capture on these shapes and still trails the cuBLAS call; the layer norm is $7\text{–}10\%$
behind Triton and that gap is open.

## The multiply was waiting on a copy that had not been issued

A block owns a $64 \times 64$ tile of $C$ — $16 \times 16 = 256$ threads holding $4 \times 4$
outputs each — fed from 33792 bytes of shared memory holding a transposed $A$ and a $B$. The
kernel that entered this stage filled it in the worst order: copy the tile, hit the barrier,
then multiply. Nothing moved while the multiply-adds ran, and nothing multiplied while the next
tile moved.

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-006/matmul-load-in-flight-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-006/matmul-load-in-flight.svg' | relative_url }}" width="1040" height="390" alt="Two schematics of one K step of the matrix multiply. Left, one shared buffer: a 64 by 32 A tile and a 32 by 64 B tile are copied, the block hits a barrier, then the multiply-adds run, so no copy is in flight while the arithmetic does. Right, two buffers: the multiply-adds of one tile and the copy of the next tile occupy the same interval. The A tile's copies are 4 bytes each because the transpose scatters their destination; the B tile's are 16 bytes. Both kernels hold 33792 bytes of shared memory.">
  </picture>
  <figcaption>
    <p>Schematic, not a measurement: the same block tile and the same 33792 bytes of shared memory, filled two ways. On the left copy, barrier and multiply-adds strictly alternate; on the right the next tile's copy occupies the same interval as this tile's multiply-adds. <a href="{{ '/mage/assets/figures/mage-006/matmul-load-in-flight.svg' | relative_url }}" download>Download the SVG</a>.</p>
  </figcaption>
</figure>

The pipeline keeps the footprint and splits it: two buffers, one $64 \times 32$ $A$ tile and one
$32 \times 64$ $B$ tile each, copies issued with `cp.async` and the wait deferred by
`cp_async_wait_group(1)`, so one copy group may still be outstanding. The $A$ tile needs
four-byte copies because the transpose scatters its destination in shared memory; $B$ needs none
of that and takes sixteen-byte copies.

The first pipeline was wrong, and the harness would have reported a 69 µs "win" from it: the
buffer offsets were computed in the wrong units, so one buffer was read from inside the other,
and the last tile consumed $\text{tiles} \bmod 2$ instead of $(\text{tiles}-1) \bmod 2$. The
correctness check caught both. After the fixes the $1024^3$ product matches the PyTorch FP32
reference with a maximum absolute error of $0.0$, and the kernel measures **68.62 µs** against
80.00 — stable at 68.35, 68.60, 68.68 and 68.62 across four sessions. The second buffer costs
registers: 96 a thread instead of 56, spent keeping both buffers' addresses live.

## The layer norm was not waiting on anything; its shape was wrong

Layer normalization reduces each row twice, once for the mean and once around it:

$$
\mu_i=\frac{1}{d}\sum_{j=1}^{d}x_{ij}, \qquad
\sigma_i^2=\frac{1}{d}\sum_{j=1}^{d}\left(x_{ij}-\mu_i\right)^2 .
$$

Nothing here waits on a copy, so the question was why Triton's kernel is faster at the same
shape. Counters are unavailable on this host, so the answer came out of Triton's **generated
code**: its `norm_kernel` was compiled offline for `sm_89` through the `ASTSource`/`GPUTarget`
path — no GPU, no execution — and the PTX and cubin censused.

| Property | Triton `norm_kernel` | committed `layer_norm_pair` |
| --- | --- | --- |
| Grid × block | 4096 × 128, one block per row | 1024 × 256, two warps per row |
| Registers / shared | 31 / 16 bytes | 39 / 64 bytes |
| Loads | 24 scalar `ld.global.b32`, covering x, scale and bias | 12 quad loads |
| Stores | 8 scalar | quad |
| Passes over x | **one**, held in registers | two |
| Barriers | 3 | 1 |

The lesson is not vectorisation: Triton's loads are scalar 32-bit, not the 128-bit quads the
Rust kernel already used. With $d = 768$ and one block of 128 threads per row, each thread owns
$\tfrac{768}{128} = 6$ values of the row in eight register slots — a quad and a masked quad — so
the row is read once and both sums come from registers.

`layer_norm_row` takes that shape: 4096 blocks of 128 threads, one per row; four warps reducing
with `shuffle_down` and meeting once in **eight floats of shared memory behind one barrier**;
the output written from the registers that already hold it; and `rsqrt_approx_f32` where Triton
emits $1.0/\sqrt{\sigma^2+\epsilon}$ through `sqrt_rn_f32` — one instruction, about $10^{-7}$
relative error, inside the $10^{-4}$ tolerance. Wider rows keep the two-warp kernel and widths
that are not a multiple of four keep the scalar one. It measures **8.97 µs** against 10.05, and
8.85 µs in the three other sessions that measured it, against Triton's 7.99, 8.06, 8.07, 8.09,
8.10 and 8.32 µs. The register profile now matches and the single pass is the same, but the
kernel is still $7\text{–}10\%$ behind and what remains cannot be attributed on this host; it is
tracked in [mage issue #54](https://github.com/superposition/mage/issues/54).

## Evidence

Kernel time is the sum of captured kernel durations over 100 iterations, from one Nsight Systems
capture per implementation and operation; spans are the mean of 300 warmed CUDA-event samples in
three rounds. Every output was checked against the PyTorch FP32 reference before any timing was
kept. Microseconds throughout.

| Stage | Matrix multiplication | LayerNorm | Retained in |
| --- | ---: | ---: | --- |
| original arrangement | 343.99 | 18.64 | mage-001 |
| first rewrite (PR #42) | 141.70 | 11.03 | mage-002, mage-003 |
| second rewrite (PR #43 / #44) | 80.00 | 10.05 | mage-003 |
| third rewrite (PR #49 / #52) | **68.62** | **8.97** | mage-006 |

*The LayerNorm value at PR #42 is the warp kernel measured in a later session than its own — the
`mage-002` namespace records 11.09 µs for the same kernel — and the value at the third rewrite is
8.85 µs in the three other sessions that measured it. The spans around the call move with the
last two stages: 82.60 → 74.09 µs for the matrix multiply and 12.91 → 12.26 µs for layer
normalization.*

The three untouched operations bound how much of that movement could be drift: between the
`mage-003` and `mage-006` namespaces their kernel time moves by 1.6%, 1.9% and 0.0% — 10.97 →
11.15, 80.07 → 81.60 and 10.33 → 10.33 µs. The library side is not that steady, which is why no
baseline is compared across namespaces: the PyTorch neighbor-aggregation kernel moves from 67.33
to 120.93 µs between the same two.

## What was tried and not kept

Single development measurements, not retained evidence. The first two fixed the block size — 128
threads holding a quad plus a masked tail slot is kept because both alternatives measured slower —
and the last three read the row once without changing the launch shape.

- **96 threads per row**: 8.99 µs of kernel time, against 8.09 for Triton in the same session;
  **192 threads per row, one quad each**: 9.11 µs against 8.85 for the retained 128-thread build.
- **Four warps per row on an uneven split**: 13.3–13.7 µs of event span against 12.67; **a row
  staged in shared memory**: 14.3 µs against the same 12.67; **a row held in registers on the
  two-warp split**: 13.88 µs against the same 12.67.

## What the numbers do not establish

- **The library call is still ahead of the multiply**: 68.62 µs against 44.03–66.22 for the cuBLAS
  call behind PyTorch across the four namespaces, so the margin is small and session-dependent.
- **Triton's matrix multiply is not stable between sessions**: 71.94, 79.84, 86.95, 90.09 and
  100.80 µs across captures, where the Rust kernel moved only within 68.35–68.68. The
  layer-normalization control from the same session returned 8.32 µs, inside Triton's 7.99–8.32
  band, so that comparison is usable and no matrix-multiply ranking follows from one pairing.
- **The layer-normalization gap is open**: 8.85–8.97 µs against 7.99–8.32, $7\text{–}10\%$, with
  the register profile matched and the same single-pass structure. Nsight Compute is unavailable,
  so both occupancy arguments rest on the resource request each kernel makes, not on counters.
- **One capture per case, one workstation**: kernel time carries no interval of its own, and the
  two views come from separate runs, so subtracting one from the other does not isolate host
  overhead. Five fixed FP32 shapes, one WSL2 host, an RTX 4090; compilation, transfers, tile
  tails, lower precision and backward passes are excluded.

The [field note](https://superposition.github.io/mage/experiments/mage-006/) carries every figure
and table; the [technical record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-006.md)
has the method and the reproduction commands.
