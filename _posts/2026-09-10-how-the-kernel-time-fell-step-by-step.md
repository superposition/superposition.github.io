---
title: "How the kernel time fell, step by step"
description: Three measured stages took the Rust matrix multiply from 344 to 80 microseconds and layer normalization from 18.6 to 10.1, with the prediction that chose each change and the attempts that measured worse.
date: 2026-09-10 16:30:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-003
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-003.md
math: true
---
Two Rust kernels were rewritten once and the numbers moved. The interesting part is what came next: neither of the following changes came from a profiler. One came from deliberately building a **worse** register shape and reading the ratio, the other from counting how many threads the grid could keep resident. Several further attempts were measured, and they were slower than what they replaced.

This entry follows the same five FP32 operations through the third round of measurements. The kernels and the full method are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-003.md), and the earlier rounds are in [field note 001](https://superposition.github.io/mage/experiments/mage-001/) and [field note 002](https://superposition.github.io/mage/experiments/mage-002/).

## Two kernels, six numbers

Matrix multiplication and layer normalization each have three measured stages. The values are GPU kernel time — the sum of captured kernel durations over 100 iterations, taken from separate Nsight Systems captures of the same shapes.

Matrix multiplication: **343.99 → 141.70 → 80.00 µs**. Layer normalization: **18.64 → 11.03 → 10.05 µs**. The spans around each call moved with them: 326.72 → 144.41 → 82.60 µs, and 19.47 → 15.43 → 12.91 µs.

One value in the middle needs a footnote. Layer normalization's 11.03 µs is the warp kernel of the first rewrite as measured in the third capture session; the session that published the first rewrite recorded 11.09 µs for the same kernel. The two sessions differ by 0.5%, which is the resolution this harness has.

## The arrangement that started it

The original matrix multiply gives each thread one output of a 16 × 16 tile. A thread reads one value of $A$ and one value of $B$ from the shared tile for every multiply-add, so nothing is reused: **two shared reads per multiply-add**, 4096 blocks, 37 registers.

The original layer normalization gives each row a block of 256 threads and reads the row three times — once for the mean, once for the centered variance, once for the output. Each of the two reductions halves the block through eight barriers, so every row crosses **19 barriers**.

The first rewrite answered both. The matrix multiply moved to a **4 × 4 tile of outputs per thread**: sixteen multiply-adds from eight shared reads, or 0.5 reads per multiply-add, with 64 × 64 block tiles and a 32-deep step in the contraction. Layer normalization moved to **one warp per row**, reading 128-bit quads and reducing with shuffles instead of shared memory and barriers. Kernel time fell to 141.70 µs and 11.03 µs.

## A ratio chose the next matrix multiply

Hardware counters are not available on this host, so occupancy, cache behavior and memory bandwidth cannot be read directly. There is a substitute: build two variants and see which number moves.

A **32 × 32 block tile with a 2 × 4 register tile** produces eight outputs from two values of $A$ and four values of $B$, which is six shared reads for eight multiply-adds, or **0.75 reads per multiply-add** against 0.5 for the retained build. If shared-memory load instructions are the limit, that predicts a **1.5×** difference. Measured in the same session, the CUDA-event span was 210.51 µs against 145.61 µs: **1.44×**. Both variants issue the same multiply-adds, so the ratio tracks the read count rather than the arithmetic.

The confirmation was then built out of three measured steps, each one removing read instructions rather than adding parallelism:

- reading the $B$ tile as a single 128-bit quad: 145.6 → **114.9 µs** around the call;
- storing the $A$ tile transposed, so the four rows a thread owns are contiguous and one 128-bit load fetches them: → **89.9 µs**;
- deepening the step in the contraction from 32 to 64, which halves the number of barrier pairs: → **80.00 µs** of kernel time.

Reading the shared tiles as quads is what makes the count fall: the retained kernel performs one 128-bit read of $A$ and one of $B$ per step for sixteen multiply-adds, so shared reads per multiply-add drop from **0.5 to 0.125**. The first two figures are spans around the call; the last is kernel time. They are quoted with their instrument because they are not one series.

## Residency chose the layer norm

Layer normalization moved for a different reason. The one-warp kernel launches 512 blocks of 256 threads for 4096 rows. That is 131072 threads; across the 128 streaming multiprocessors of the 4090 it is at most 1024 resident threads per SM against a limit of 1536. The grid is short of the threads that keep memory loads in flight.

**Two warps per row**, each owning half a row, doubles the block count to 1024. The two partial sums meet once in 64 bytes of shared memory behind a single barrier, and each warp computes the sum and the sum of squares in one pass, so the row is read once for the statistics instead of twice.

The comparison was five runs per build on the same input, timed by the binary itself: one warp per row 13.76, 13.55, 13.60, 13.53, 13.76 µs (mean 13.64); two warps per row 12.87, 12.58, 12.53, 12.54, 12.94 µs (mean 12.69). The ranges do not overlap. The retained capture prices the two-warp kernel at 10.05 µs of kernel time.

## What was tried and not kept

Every attempt below is a single development measurement, not retained evidence, and the metric is named because the attempts were not all timed the same way.

- **32 × 32 tiles with a 2 × 4 register tile**: 210.51 µs event span against 145.61 µs for the retained build. This is the experiment that identified the limit; it was not adopted.
- **8 × 4 register tile on 128-row blocks**: 147.74 µs event span against 145.61 µs, inside the few percent this harness cannot resolve.
- **Layer normalization with 128-thread blocks** (four rows per block): 14.4 µs event span.
- **A row staged in shared memory for a single global pass**: 14.3 µs event span.
- **A row held in eight named quad registers**: 13.4–14.0 µs event span.
- **Four warps per row**: 13.3–13.7 µs event span. Doubling again does not help; the two-warp split already reaches the resident-thread limit.
- **A row held in a `[F32x4; 8]` array**: 22.12 µs of kernel time against 11.02 µs for the warp kernel in the same build. It spilled to local memory, which is why the row is spread across lanes instead.

Bias + GELU, triangle contraction and neighbor aggregation keep their original kernels. Between the first and third measurement rounds their kernel time moves by less than 3%, which bounds how much of the two rewritten kernels' movement could be drift rather than the rewrites.

## What the numbers do not establish

The library call is still ahead: the matrix multiply is 80.0 µs against 44.0 µs for the cuBLAS call behind PyTorch in this capture. The Triton matrix multiply is not stable between sessions — 83.78 µs in the first round, 83.77 µs in one later capture, 71.94 µs in the retained one — while the Rust kernel moves from 80.12 µs to 80.00 µs. In one session Triton is faster and in the other slower, so no ranking between the two follows from a single pairing. Layer normalization is behind Triton's kernel (10.05 against 7.99 µs) and ahead of both baselines around the call (12.91 against 20.62 and 17.30 µs).

These are five fixed FP32 shapes on one WSL workstation with unlocked clocks. Kernel time comes from a single capture per case and carries no interval of its own; the spans are means of 300 warmed samples in three rounds, and they can include gaps while the host submits work. No counters were available, so the residency figure above is a limit on what the grid can hold, not a measurement of what it held.

## Measured values

The retained evidence is one Nsight Systems capture per implementation and operation, 100 iterations each, plus three rounds of 100 CUDA-event samples per implementation. PyTorch and Triton were measured in the same session as the final Rust kernels.

How each kernel reached its measured time:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-003/kernel-progression-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-003/kernel-progression.svg' | relative_url }}" width="740" height="510" alt="Two horizontal step charts of GPU kernel time in microseconds. Matrix multiplication falls from 343.99 at mage-001 to 141.70 after the 4 by 4 register tile and to 80.00 after the 128-bit shared reads and the 64-deep K step; layer normalization falls from 18.64 to 11.03 after one warp per row and to 10.05 after two warps per row. Each stage is labelled with the change that produced it.">
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
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Kernel time and time around the call for the same five operations:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-003/comparison-views-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-003/comparison-views.svg' | relative_url }}" width="740" height="351" alt="GPU kernel time and time around the call per operation: PyTorch has the shortest kernel time for matrix multiplication and triangle contraction, Triton for Bias + GELU, LayerNorm and neighbor aggregation; around the call Rust is shortest for Bias + GELU, LayerNorm and neighbor aggregation, and PyTorch for matrix multiplication and triangle contraction.">
  </picture>
  <figcaption>
    <p>Top row: time inside the kernels. Bottom row: time around the call. Each column has its own scale, so implementations compare within a column.</p>
    <details>
      <summary>Rust values, both views (µs)</summary>
      <table>
        <caption class="visually-hidden">Rust kernel time and event span per operation, with the earlier rounds</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">Kernel</th><th scope="col">Span</th><th scope="col">Kernel, mage-001</th><th scope="col">Kernel, mage-002</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>80.0</td><td>82.6</td><td>344.0</td><td>141.7</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>11.0</td><td>13.3</td><td>11.2</td><td>11.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>10.1</td><td>12.9</td><td>18.6</td><td>11.1</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>80.1</td><td>83.5</td><td>81.2</td><td>80.4</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>10.3</td><td>12.9</td><td>10.3</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

GPU kernel time for all five operations and three implementations:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-003/comparison-kernel-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-003/comparison-kernel.svg' | relative_url }}" width="740" height="650" alt="GPU kernel time per operation: PyTorch has the shortest time for matrix multiplication and triangle contraction, Triton for Bias + GELU, LayerNorm and neighbor aggregation.">
  </picture>
  <figcaption>
    <p>GPU kernel time, summed per operation. Separate Nsight Systems capture, 100 iterations per measurement; gaps between launches are excluded. The WSL timestamp fallback has reduced precision.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>44.0</td><td>71.9</td><td>80.0</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>15.8</td><td>7.6</td><td>11.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>11.2</td><td>8.0</td><td>10.1</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>28.5</td><td>81.6</td><td>80.1</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>67.3</td><td>8.0</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Time around the call:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-003/comparison-event-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-003/comparison-event.svg' | relative_url }}" width="740" height="650" alt="Time around the call: Rust has the shortest event span for Bias + GELU, LayerNorm and neighbor aggregation; PyTorch has the shortest for matrix multiplication and triangle contraction.">
  </picture>
  <figcaption>
    <p>Mean of 300 warmed CUDA-event spans, collected in three rounds with rotating implementation order. Whiskers show the range of the three round means, not a confidence interval. A span can include gaps while the host submits work.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">Event span per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>58.2</td><td>97.4</td><td>82.6</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>23.7</td><td>21.2</td><td>13.3</td></tr>
          <tr><th scope="row">LayerNorm</th><td>17.3</td><td>20.6</td><td>12.9</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>54.1</td><td>94.4</td><td>83.5</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>89.6</td><td>25.7</td><td>12.9</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Each row has its own scale, so implementations compare within a row and not across operations. The two views come from separate runs with different launch rhythms, so subtracting one from the other does not isolate host overhead. Compilation, transfers and service startup are excluded.
