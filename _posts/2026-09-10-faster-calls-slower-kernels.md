---
title: "A faster call can hide a slower kernel"
description: The first profiles changed the question. Before choosing a language, I need to understand which part of the work became faster.
date: 2026-09-10 00:01:00 -0400
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
