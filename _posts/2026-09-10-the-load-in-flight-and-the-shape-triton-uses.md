---
title: "The load in flight, and the shape Triton uses"
description: "A matrix multiply that waited on its own tile loads was given a second buffer and an asynchronous copy; a layer norm was rewritten in the shape Triton's kernel already uses, read from its generated code. One gap closed to a lead, the other narrowed and left open."
date: 2026-09-10 20:30:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-006
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-006.md
math: true
---
The previous round left two Rust kernels behind their alternatives for two different reasons, and this round fixes them for two different reasons. The matrix multiply was **waiting on its own memory**: every tile of the contraction was copied into shared memory, the block synchronized, and only then did the arithmetic start, so the multiply-adds idled while the tile arrived. The layer norm was doing the right amount of work in the wrong **shape**, which was visible only in the generated code of the kernel it was being compared against.

The two changes take the matrix multiply from 80.00 to **68.62 µs** of GPU kernel time and layer normalization from 10.05 to **8.97 µs**, on the same five FP32 shapes as the earlier rounds. The kernels and the full method are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-006.md); the earlier rounds are in [field note 001](https://superposition.github.io/mage/experiments/mage-001/), [field note 002](https://superposition.github.io/mage/experiments/mage-002/) and [field note 003](https://superposition.github.io/mage/experiments/mage-003/).

## Two kernels, four stages each

Matrix multiplication: **343.99 → 141.70 → 80.00 → 68.62 µs**. Layer normalization: **18.64 → 11.03 → 10.05 → 8.97 µs**. These are GPU kernel times — the sum of captured kernel durations over 100 iterations, from separate Nsight Systems captures of the same shapes. Around the call the spans move with them, from 82.60 to 74.09 µs for the matrix multiply and from 12.91 to 12.26 µs for layer normalization.

## A copy the arithmetic can hide behind

A matrix product reuses both of its inputs along the contraction, and a tile makes that reuse explicit. The kernel that entered this stage keeps a 4 × 4 tile of outputs per thread inside a 64 × 64 block tile, with a 64-deep step in the contraction; the transposed A tile and the B tile sit in 33792 bytes of shared memory. The trouble is the order of operations: the tile is copied from global memory, the block hits a barrier, and the multiply-adds begin. The copy and the arithmetic never overlap, so the tensor cores of the schedule wait on data movement that could have been happening earlier.

The rewrite gives the kernel **two shared buffers** and issues the copies asynchronously with `cp.async`. Each buffer holds one 64 × 32 A tile and one 32 × 64 B tile, so the footprint is unchanged, and while a tile is being multiplied the copy for the tile two steps ahead is in flight. The A tile needs **four-byte** copies because the transpose scatters its destination in shared memory; the B tile needs no rearrangement and uses **sixteen-byte** copies. The final wait is deferred, so one copy group may still be outstanding when the arithmetic starts.

The first version of this pipeline was wrong, and the timing harness would have reported a 69 µs "win" from it. Two defects, both caught by the correctness check rather than by reading the code: the buffer offsets were computed in the wrong units, so one buffer was read from inside the other, and the last tile consumed buffer `tiles % 2` instead of `(tiles - 1) % 2`. Nothing measured on the broken build was kept. After the fixes the 1024-cubed product matches the PyTorch FP32 reference with a maximum absolute error of 0.0, and the kernel measures **68.62 µs** against 80.00 µs for the kernel it replaces — with 96 registers per thread instead of 56, spent on the second buffer's addresses.

That value is stable across four capture sessions: 68.35, 68.60, 68.68 and 68.62 µs.

## The shape the other kernel uses

Layer normalization reduces each row twice, once for the mean and once around it:

$$
\mu_i=\frac{1}{d}\sum_{j=1}^{d}x_{ij}, \qquad
\sigma_i^2=\frac{1}{d}\sum_{j=1}^{d}\left(x_{ij}-\mu_i\right)^2 .
$$

Nothing in this kernel waits on a copy, so the question was different: why is Triton's kernel faster at the same shape? Hardware counters are unavailable on this host, so the comparison was made against Triton's **generated code**. Its `norm_kernel` was compiled offline for `sm_89` with the `ASTSource`/`GPUTarget` path — no GPU, no execution — and the PTX and cubin were counted:

| Property | Triton `norm_kernel` | committed Rust kernel |
| --- | --- | --- |
| Grid × block | 4096 × 128 (one block per row) | 1024 × 256 (two warps per row) |
| Registers | 31 | 39 |
| Shared memory | 16 bytes | 64 bytes |
| Loads | 24 scalar `ld.global.b32` | 12 quad loads |
| Stores | 8 scalar | quad |
| Passes over the row | one, held in registers | two |
| Barriers | 3 | 1 |

The lesson is not vectorisation. Triton's loads are scalar 32-bit, not the 128-bit quads the Rust kernel was already using. The differences that matter are **occupancy and a single pass**: 31 registers, almost no shared memory, one block per row, and the eight elements each thread owns staying in registers from the load to the store, so the row is read once.

The rewrite takes that shape. One block of 128 threads per row; each thread holds a quad in its first slot and a masked quad in its second, which covers the whole row without a second global pass; the four warps reduce with `shuffle_down` offsets and exchange once in **eight floats of shared memory behind one barrier**; the output is written from the registers that already hold the values. The reciprocal square root becomes `rsqrt_approx_f32` — one instruction, about 1e-7 relative error, far inside the 1e-4 tolerance — instead of `1.0 / sqrt_rn_f32`, which is what Triton emits. Wider rows keep the two-warp kernel and widths that are not a multiple of four keep the scalar one.

The kernel measures **8.97 µs** against 10.05 µs for the kernel it replaces, and 8.85 µs in the three other sessions that measured it.

## The gap that is still open

Triton's layer normalization has returned 7.99, 8.06, 8.07, 8.09, 8.10 and 8.32 µs of kernel time across the sessions in which it was captured, and the Rust kernel measures 8.85 to 8.97 µs in the same period. The gap is **7–10%** and stable. The register profile now matches, the single-pass structure is the same, and the remaining difference cannot be attributed on this host: no counters are available, so occupancy, cache behavior and scheduling cannot be separated. The gap is tracked in [mage issue #54](https://github.com/superposition/mage/issues/54) rather than treated as closed.

## What was tried and not kept

Every attempt below is a single development measurement, not retained evidence, and the metric is named because they were not all timed the same way.

- **96 threads per row** instead of 128: 8.99 µs of kernel time, against 8.09 µs for Triton in the same session.
- **192 threads per row, one quad each**: 9.11 µs of kernel time, against 8.85 µs for the retained 128-thread build.
- **Four warps per row on an uneven split**: 13.3–13.7 µs event span against 12.67 µs for the two-warp build.
- **A row staged in shared memory** for a single global pass: 14.3 µs event span, against the same 12.67 µs.
- **A row held in registers on the two-warp split**: 13.88 µs event span, against the same 12.67 µs.

The first two fixed the block size of the new kernel: 128 threads holding a quad plus a masked tail slot is kept because both alternatives measured slower. The other three read the row once without changing the launch shape and none of them beat the kernel they were compared against.

Bias + GELU, triangle contraction and neighbor aggregation keep their kernels, and between the previous and current namespaces their kernel time moves by 1.6%, 1.9% and 0.0% — 10.97 → 11.15 µs, 80.07 → 81.60 µs, 10.33 → 10.33 µs. Those three numbers bound how much of the two rewritten kernels' movement could be drift. The library side is not as steady: the PyTorch neighbor-aggregation kernel moves from 67.33 to 120.93 µs between the same two namespaces, which is why no baseline is compared across namespaces.

## What the numbers do not establish

The library call is still ahead of the matrix multiply: 68.62 µs of kernel time against 44.03–66.22 µs for the cuBLAS call behind PyTorch across the four namespaces. Triton's matrix multiply is not stable between sessions — where the two were captured together it has returned 71.94, 79.84, 86.95 and 90.09 µs, against 68.35–68.68 µs for the Rust kernel — so no ranking follows from a single pairing.

**One capture in this stage is known to be unusable.** In the session that captured both rewritten kernels, Triton's matrix-multiply control returned 100.80 µs, above the 71.94–90.09 µs band its other same-session captures occupy, so that capture ran under some load. Its LayerNorm control returned 8.32 µs, close to the 7.99–8.19 µs band it otherwise occupies, so the LayerNorm comparison from that session is usable. The two Rust kernels matched their stable ranges in the same session.

These are five fixed FP32 shapes on one WSL2 workstation with an RTX 4090 and unlocked clocks. Kernel time comes from a single capture per case and carries no interval of its own; the spans are means of 300 warmed samples in three rounds and can include gaps while the host submits work. Compilation, transfers, lower precision and backward passes are outside the measurements.

## Measured values

The retained evidence is one Nsight Systems capture per implementation and operation, 100 iterations each, plus three rounds of 100 CUDA-event samples per implementation. PyTorch, Triton and the two rewritten Rust kernels were captured in the same session.

How each kernel reached its measured time:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-006/kernel-progression-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-006/kernel-progression.svg' | relative_url }}" width="740" height="510" alt="Two horizontal step charts of GPU kernel time in microseconds. Matrix multiplication falls from 343.99 at mage-001 to 141.70 after the 4 by 4 register tile, to 80.00 after the 128-bit shared reads and the 64-deep K step, and to 68.62 after the cp.async double buffer; layer normalization falls from 18.64 to 11.03 with one warp per row, to 10.05 with two warps per row, and to 8.97 with one block per row holding a quad per thread. Each stage is labelled with the change that produced it.">
  </picture>
  <figcaption>
    <p>GPU kernel time at each stage, from separate Nsight Systems captures of 100 iterations. The factor between stages is that step's speed-up. Lower is better.</p>
    <details>
      <summary>Values (µs of GPU kernel time)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per stage for matrix multiplication and layer normalization</caption>
        <thead><tr><th scope="col">Stage</th><th scope="col">Matrix multiplication</th><th scope="col">LayerNorm</th></tr></thead>
        <tbody>
          <tr><th scope="row">mage-001</th><td>343.99</td><td>18.64</td></tr>
          <tr><th scope="row">PR #42</th><td>141.70</td><td>11.03</td></tr>
          <tr><th scope="row">PR #43 / #44</th><td>80.00</td><td>10.05</td></tr>
          <tr><th scope="row">PR #49 / #52</th><td>68.62</td><td>8.97</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Kernel time and time around the call for the same five operations:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-006/comparison-views-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-006/comparison-views.svg' | relative_url }}" width="740" height="351" alt="GPU kernel time and time around the call per operation: PyTorch has the shortest kernel time for matrix multiplication and triangle contraction, Triton for Bias + GELU, LayerNorm and neighbor aggregation; around the call Rust is shortest for Bias + GELU, LayerNorm and neighbor aggregation, and PyTorch for matrix multiplication and triangle contraction.">
  </picture>
  <figcaption>
    <p>Top row: time inside the kernels. Bottom row: time around the call. Each column has its own scale, so implementations compare within a column.</p>
    <details>
      <summary>Rust values, both views (µs)</summary>
      <table>
        <caption class="visually-hidden">Rust kernel time and event span per operation, with the earlier rounds</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">Kernel</th><th scope="col">Span</th><th scope="col">Kernel, mage-001</th><th scope="col">Kernel, mage-003</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>68.6</td><td>74.1</td><td>344.0</td><td>80.0</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>11.2</td><td>14.0</td><td>11.2</td><td>11.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>9.0</td><td>12.3</td><td>18.6</td><td>10.1</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>81.6</td><td>86.9</td><td>81.2</td><td>80.1</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>10.3</td><td>15.9</td><td>10.3</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

GPU kernel time for all five operations and three implementations:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-006/comparison-kernel-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-006/comparison-kernel.svg' | relative_url }}" width="740" height="650" alt="GPU kernel time per operation: PyTorch has the shortest time for matrix multiplication and triangle contraction, Triton for Bias + GELU, LayerNorm and neighbor aggregation.">
  </picture>
  <figcaption>
    <p>GPU kernel time, summed per operation. Separate Nsight Systems capture, 100 iterations per measurement; gaps between launches are excluded. The WSL timestamp fallback has reduced precision, and the Triton matrix-multiply capture in this session ran under load.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>66.2</td><td>100.8</td><td>68.6</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>18.3</td><td>7.7</td><td>11.2</td></tr>
          <tr><th scope="row">LayerNorm</th><td>11.2</td><td>8.3</td><td>9.0</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>28.6</td><td>100.5</td><td>81.6</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>120.9</td><td>6.1</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Time around the call:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-006/comparison-event-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-006/comparison-event.svg' | relative_url }}" width="740" height="650" alt="Time around the call: PyTorch has the shortest event span for matrix multiplication and triangle contraction, and Rust for Bias + GELU, LayerNorm and neighbor aggregation.">
  </picture>
  <figcaption>
    <p>Mean of 300 warmed CUDA-event spans, collected in three rounds with rotating implementation order. Whiskers show the range of the three round means, not a confidence interval.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">Event span per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>61.0</td><td>93.3</td><td>74.1</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>35.6</td><td>28.4</td><td>14.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>26.4</td><td>27.0</td><td>12.3</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>75.0</td><td>100.1</td><td>86.9</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>124.1</td><td>27.6</td><td>15.9</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Each row has its own scale, so implementations compare within a row and not across operations. The two views come from separate runs with different launch rhythms, so subtracting one from the other does not isolate host overhead.
