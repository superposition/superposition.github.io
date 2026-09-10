---
title: "A faster call can hide a slower kernel"
description: The first profiles changed the question. Before choosing a language, I need to understand which part of the work became faster.
date: 2026-09-10 00:01:00 -0400
updated: 2026-09-10
tags: [kernels, mathematics, measurement, learning]
experiment_id: mage-001
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-001-comparison.md
math: true
---
I want to push further into writing kernels. The first versions give me something concrete to work with: five mathematical operations, implementations in Rust and Triton, a PyTorch reference, and profiles from the same 4090.

Some of the rewrites improve the measured time. Others make it worse. The more interesting result is that even the answer to “which is faster?” changes when I change the boundary of the measurement.

## Where does the work begin?

Take bias followed by GELU, a nonlinear transformation used in neural networks. The mathematical operation is the same across the three implementations. In our CUDA-event measurements, the Rust call spans about 13 microseconds and the Triton call about 24. In a separate GPU profile, the Triton kernel executes in about 8 microseconds and the Rust kernel in about 11.

The [interactive Mage graphs](https://superposition.github.io/mage/experiments/mage-001/#profiles) let you switch between these views and the number of kernel launches.

An event span can include a gap while the host submits work. A kernel duration describes execution on the GPU. The application experiences a larger system: allocation, submission, computation, synchronization, and whatever comes next. A shorter span around one call does not by itself establish that its kernel does less work or that a service will respond faster.

These measurements come from separate runs with different launch rhythms, so subtracting them would not isolate Python overhead. That uncertainty is useful. It tells me which experiment to build next.

## The equation still leaves choices open

The same pattern appears elsewhere. The first custom matrix multiplications are slower than the library-backed PyTorch call. Both custom triangle contractions use one kernel launch, but PyTorch's three-launch expression still has the shortest total GPU execution time in that capture.

Reducing the number of launches is one possible improvement. It does not settle the choices inside the kernel: which values are reused, how threads share partial answers, how memory is arranged, or which instructions execute the arithmetic.

This is the part of revisiting linear algebra that interests me. An equation names a relationship. Implementing it forces me to think about the arrangement of information that makes the relationship affordable to compute.

There is another relationship worth keeping in view. If a kernel accounts for a fraction $f$ of a request's time and becomes $s$ times faster, the simplified overall speedup is $1/(1-f+f/s)$. If that fraction is 20% and the kernel becomes twice as fast, total latency falls by only 10%, assuming everything else stays the same. The larger system limits what an isolated improvement can deliver.

## What I want to try next

The next investigation starts with the launch path. I want to compare the same fused operation through warmed calls, batches of launches, and graph replay where the pinned tools support it. A compiled PyTorch baseline belongs in that comparison too. The aim is to find out whether the apparent native advantage survives a more closely matched execution pattern.

Then there are more demanding questions: how reductions share work, how a graph with uneven numbers of neighbors changes scheduling, and when a different tensor layout exposes useful reuse. Lower precision and tensor-core experiments are another direction, with their own accuracy contracts. I want each change to test an explanation, and I want to keep the regressions alongside the improvements.

For the production question, the current results are a starting point. They favor retaining the library-backed dense operations and investigating Triton for custom PyTorch work. Rust also raises questions about native integration and control of execution. A representative model or service will have to decide whether those advantages matter in context.

AI makes it easier for me to reach these experiments. What I want to develop alongside that speed is the ability to say what an experiment means. That is how this notebook can become useful beyond the code it produces.

The [next research steps are in Mage](https://github.com/superposition/mage/blob/master/docs/research/kernel-exploration.md). The kernels, full measurements, and reproduction instructions stay there; this journal follows the questions and what changes as I work through them.

## Measured values

Five FP32 operations, three implementations, one RTX 4090 under WSL2. The figures below are the retained measurements behind this entry; the method and reproduction steps are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-001-comparison.md).

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-001/comparison-kernel-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-001/comparison-kernel.svg' | relative_url }}" width="740" height="650" alt="GPU kernel time: Triton has the shortest measured time for GELU, LayerNorm, and neighbor aggregation. PyTorch has the shortest for matrix multiplication and triangle contraction.">
  </picture>
  <figcaption>
    <p>GPU kernel time, summed per operation. Separate Nsight Systems capture, 100 iterations per measurement; gaps between launches are excluded. The WSL timestamp fallback has reduced precision.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>56.0</td><td>83.8</td><td>344.0</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>15.9</td><td>7.9</td><td>11.2</td></tr>
          <tr><th scope="row">LayerNorm</th><td>11.4</td><td>8.2</td><td>18.6</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>28.5</td><td>93.9</td><td>81.2</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>78.3</td><td>7.9</td><td>10.3</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-001/comparison-event-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-001/comparison-event.svg' | relative_url }}" width="740" height="650" alt="Time around the call: Rust has the shortest event span for GELU and neighbor aggregation. PyTorch has the shortest for the other three operations. These spans include possible launch gaps.">
  </picture>
  <figcaption>
    <p>Mean of 300 warmed CUDA-event spans, collected in three rounds with rotating implementation order. Whiskers show the range of the three round means, not a confidence interval. A span can include gaps while the host submits work.</p>
    <details>
      <summary>Values (µs)</summary>
      <table>
        <caption class="visually-hidden">Event span per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>50.9</td><td>88.8</td><td>326.7</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>27.7</td><td>24.3</td><td>13.0</td></tr>
          <tr><th scope="row">LayerNorm</th><td>17.8</td><td>22.6</td><td>19.5</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>55.6</td><td>91.9</td><td>78.5</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>89.7</td><td>21.8</td><td>13.2</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-001/comparison-launches-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-001/comparison-launches.svg' | relative_url }}" width="740" height="650" alt="Kernel launches per operation: PyTorch launches 2 for GELU, 3 for triangle contraction, and 4 for neighbor aggregation; 1 for matrix multiplication and LayerNorm. Triton and Rust launch 1 for every operation.">
  </picture>
  <figcaption>
    <p>Captured launches divided by 100 iterations. Both custom implementations use one kernel per operation. Fewer launches explain part of the result; they do not determine kernel duration.</p>
    <details>
      <summary>Values</summary>
      <table>
        <caption class="visually-hidden">Kernel launches per operation and implementation</caption>
        <thead><tr><th scope="col">Operation</th><th scope="col">PyTorch</th><th scope="col">Triton</th><th scope="col">Rust</th></tr></thead>
        <tbody>
          <tr><th scope="row">Matrix multiplication</th><td>1</td><td>1</td><td>1</td></tr>
          <tr><th scope="row">Bias + GELU</th><td>2</td><td>1</td><td>1</td></tr>
          <tr><th scope="row">LayerNorm</th><td>1</td><td>1</td><td>1</td></tr>
          <tr><th scope="row">Triangle contraction</th><td>3</td><td>1</td><td>1</td></tr>
          <tr><th scope="row">Neighbor aggregation</th><td>4</td><td>1</td><td>1</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

These are forward-only learning kernels at five fixed shapes, on one WSL workstation with unlocked clocks. Compilation, transfers, and service startup are excluded. Each row has its own scale, so implementations are comparable within a row and not across operations. The two views come from separate runs with different launch rhythms, so subtracting one from the other does not isolate Python overhead.
