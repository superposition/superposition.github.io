---
title: "Rewriting the layer norm and matmul kernels"
description: Two Rust kernels restructured so values stay in registers and partial answers meet inside a warp, with the measured GPU time before and after.
date: 2026-09-10 16:00:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-002
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-002.md
math: true
---
The first comparison measured five operations through PyTorch, Triton, and Rust and left two of the Rust kernels behind the alternatives. The source showed where the time went. Layer normalization passed every partial sum through shared memory and a sequence of barriers, and matrix multiplication computed one output per thread from small shared tiles. Both arrangements spend time on work the arithmetic does not ask for.

Two rewrites change where the values are held and which threads have to meet. This entry presents the kernels, the measured GPU time before and after, and the three untouched operations that stayed in the harness as controls.

## A reduction has to meet somewhere

Layer normalization reduces each row twice, once for the mean and once for the squared deviations around it:

$$
\mu_i=\frac{1}{d}\sum_{j=1}^{d}x_{ij}, \qquad
\sigma_i^2=\frac{1}{d}\sum_{j=1}^{d}\left(x_{ij}-\mu_i\right)^2 .
$$

Each reduction ends in a single value per row, so the threads holding partial answers must combine them. Dividing a row across 256 threads makes that combination the expensive part: the first kernel wrote one partial sum per thread into shared memory and halved the block through five barriers, with every thread waiting at each step.

The rewrite gives **one warp to a row**. Thirty-two lanes read the row in 128-bit quads — four consecutive floats per load — and add each quad into a single register; the warp then reduces its lanes with `shuffle_down` offsets of 16, 8, 4, 2, and 1. The partial answers meet inside registers instead of shared memory, and the same structure computes the centered variance. The resource request in the profile changes with it: 0 bytes of shared memory and 40 registers per thread, against 1024 bytes and 27 registers before, and 512 blocks of eight warps replace 4096 blocks of one row each.

Removing the barrier also removes the reason the block had to be sized to a row. The scalar `layer_norm` stays in the file for widths that are not a multiple of four.

## A tile decides how often shared memory is read

A matrix product reuses both inputs along its contraction:

$$
C_{ij}=\sum_k A_{ik}B_{kj}.
$$

One output needs a row of $A$ and a column of $B$. Neighboring outputs reuse most of that data, which is what a tile makes explicit: a block owning a 64 × 64 region of $C$ needs 64 rows of $A$ and 64 columns of $B$, reused across the whole region.

The first tiled kernel gave each thread one output from 16 × 16 tiles, so a thread read a full row and column segment of shared memory for every output: sixteen shared-memory reads per multiply-add, from 4096 blocks.

The rewrite keeps a **4 × 4 tile of outputs per thread**: sixteen accumulators fed by four values of $A$ and four of $B$ per step, which is sixteen multiply-adds from eight shared-memory reads. The contraction moves in steps of 32, and before each step the block loads its two tiles through 128-bit quads — a 64 × 32 region of $A$ and a 32 × 64 region of $B$ — into 16384 bytes of shared memory. Blocks fall from 4096 to 256 and registers per thread rise from 37 to 55.

A deeper step in the contraction means fewer barriers: the tile is loaded once per 32 columns instead of once per 16. The trade is explicit, since more values per thread means fewer threads resident, which is why the kernel keeps the 4 × 4 shape instead of a wider one.

## What the measured time shows

Both rewritten kernels move the Rust numbers closer to the library baselines in the same capture session. Matrix multiplication falls from 344.0 µs to 141.7 µs of GPU kernel time, against 54.6 µs for PyTorch's library-backed call and 84.7 µs for Triton. Layer normalization falls from 18.6 µs to 11.1 µs, against 11.4 µs for PyTorch and 8.1 µs for Triton. The spans around the call move in the same direction, from 326.7 µs to 144.4 µs and from 19.5 µs to 15.4 µs.

The three operations that keep their earlier kernels — bias + GELU, triangle contraction, and neighbor aggregation — reproduce their earlier kernel times within 2%, which is what this harness can resolve between runs. Their event spans move further, by up to 66% for Triton's neighbor aggregation, so the span is the noisier of the two measurements at these durations.

A reduction that needed a block and now needs a warp is a **structural** change, and it is the part that can be explained without hardware counters. The kernel time follows it. The counters that would separate instruction count from memory traffic from occupancy remain unavailable on this host, so that decomposition is not measured here.

## What these numbers do not establish

The rewrite closes a gap without closing it. The new matrix multiply is 2.60 × PyTorch's library call and 1.67 × Triton's kernel at this shape, and layer normalization is 1.38 × Triton's kernel while roughly level with PyTorch's.

These are five fixed FP32 shapes on one WSL workstation with unlocked clocks and no exclusive-use guarantee. Kernel time comes from a single Nsight Systems capture per implementation and operation, so it carries no round-to-round interval of its own; the LayerNorm event span for the rewritten kernel spread from 13.5 µs to 19.0 µs across three rounds, wider than the difference under discussion. Tile shapes and the contraction step were chosen by reasoning about reuse and barriers, not by a tuning sweep, and compiled PyTorch, graph replay, batched launches, lower precision, tile tails, backward passes, and end-to-end service behavior are untested.

Two variants were measured and rejected along the way, both in single runs that are not retained evidence. A layer norm variant that held a row of 128-bit quads in a `[F32x4; 8]` array measured 22.12 µs of kernel time against 11.02 µs for the warp kernel in the same build, so keeping the row per thread cost roughly twice the time. An 8 × 4 register tile on 128-row blocks measured 147.74 µs around the call against 145.61 µs for the retained 4 × 4 tile in the same session, which is inside the variation this harness cannot resolve.

The full method, the retained samples, and the reproduction commands are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-002.md). The first comparison and its graphs are in [field note 001](https://superposition.github.io/mage/experiments/mage-001/).

## Measured values

Both Rust kernels recompiled against the same five FP32 shapes, one RTX 4090 under WSL2, with PyTorch and Triton measured beside them in the same session. Kernel time is the sum of captured kernel durations over 100 iterations; spans are means of 300 warmed CUDA-event samples in three rotating rounds.

GPU kernel time for the two rewritten kernels, with the unchanged operations shown as controls:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-002/kernel-improvements-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-002/kernel-improvements.svg' | relative_url }}" width="740" height="341" alt="GPU kernel time for matrix multiplication and layer normalization, four bars each: PyTorch, Triton, the mage-001 Rust kernel, and the rewritten mage-002 Rust kernel. Matrix multiplication falls from 344.0 to 141.7 microseconds; layer normalization falls from 18.6 to 11.1 microseconds.">
  </picture>
  <figcaption>
    <p>Each panel has its own scale. Lower is better. PyTorch, Triton, and the rewritten Rust kernel come from one capture session; the mage-001 Rust bar is the earlier session.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">Rust GPU kernel time before and after the rewrite, all five operations</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">Rust mage-001</th><th scope="col">Rust mage-002</th><th scope="col">Change</th><th scope="col">Status</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>344.0</td><td>141.7</td><td>−58.8%</td><td>rewritten</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>11.2</td><td>11.0</td><td>−1.7%</td><td>control</td></tr>
          <tr><th scope="row">LayerNorm</th><td>18.6</td><td>11.1</td><td>−40.5%</td><td>rewritten</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>81.2</td><td>80.4</td><td>−0.9%</td><td>control</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>10.3</td><td>10.3</td><td>0.0%</td><td>control</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Kernel time and time around the call for the same five operations in the new capture:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-002/comparison-views-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-002/comparison-views.svg' | relative_url }}" width="740" height="351" alt="GPU kernel time and time around the call per operation in the mage-002 capture: for Bias + GELU, Triton has the shorter kernel time while Rust has the shorter event span; the rewritten Rust LayerNorm has the second shortest kernel time.">
  </picture>
  <figcaption>
    <p>Top row: time inside the kernels. Bottom row: time around the call. Each column has its own scale, so implementations compare within a column.</p>
    <details>
      <summary>Rust values, both views (µs)</summary>
      <table>
        <caption class="visually-hidden">Rust kernel time and event span before and after the rewrite</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">Kernel mage-001</th><th scope="col">Kernel mage-002</th><th scope="col">Span mage-001</th><th scope="col">Span mage-002</th><th scope="col">Status</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>344.0</td><td>141.7</td><td>326.7</td><td>144.4</td><td>rewritten</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>11.2</td><td>11.0</td><td>13.0</td><td>13.0</td><td>control</td></tr>
          <tr><th scope="row">LayerNorm</th><td>18.6</td><td>11.1</td><td>19.5</td><td>15.4</td><td>rewritten</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>81.2</td><td>80.4</td><td>78.5</td><td>83.4</td><td>control</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>10.3</td><td>10.3</td><td>13.2</td><td>12.9</td><td>control</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-002/comparison-kernel-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-002/comparison-kernel.svg' | relative_url }}" width="740" height="650" alt="GPU kernel time per operation in the mage-002 capture: Triton has the shortest time for GELU, LayerNorm, and neighbor aggregation; PyTorch has the shortest for matrix multiplication and triangle contraction.">
  </picture>
  <figcaption>
    <p>GPU kernel time, summed per operation. Separate Nsight Systems capture, 100 iterations per measurement; gaps between launches are excluded. The WSL timestamp fallback has reduced precision.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>54.6</td><td>84.7</td><td>141.7</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>15.8</td><td>7.7</td><td>11.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>11.4</td><td>8.1</td><td>11.1</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>28.4</td><td>93.8</td><td>80.4</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>75.8</td><td>8.0</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-002/comparison-event-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-002/comparison-event.svg' | relative_url }}" width="740" height="650" alt="Time around the call: Rust has the shortest event span for GELU, LayerNorm, and neighbor aggregation; PyTorch has the shortest for matrix multiplication and triangle contraction. These spans include possible launch gaps.">
  </picture>
  <figcaption>
    <p>Mean of 300 warmed CUDA-event spans, collected in three rounds with rotating implementation order. Whiskers show the range of the three round means, not a confidence interval. A span can include gaps while the host submits work.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">Event span per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>57.3</td><td>91.5</td><td>144.4</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>24.4</td><td>26.1</td><td>13.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>22.9</td><td>20.9</td><td>15.4</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>57.7</td><td>100.9</td><td>83.4</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>101.1</td><td>36.2</td><td>12.9</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Each row has its own scale, so implementations are comparable within a row and not across operations. The two views come from separate runs with different launch rhythms, so subtracting one from the other does not isolate host overhead. Compilation, transfers, and service startup are excluded.
