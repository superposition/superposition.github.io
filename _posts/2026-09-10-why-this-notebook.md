---
title: "Why this notebook: thinking above the code"
description: AI is opening more directions for me to explore. I want to keep the reasoning, the experiments, and the changes of mind in public.
date: 2026-09-10 00:00:00 -0400
tags: [AI, mathematics, kernels, learning]
experiment_id: mage-001
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-001-validation.md
math: true
---
Writing code has been a huge part of my journey. It has been a way to make an idea concrete, to test my understanding, and to discover what I had missed.

AI is changing the reach of that process. I can move into directions that interested me before but that I did not have the time or momentum to pursue. That leaves a question I want to take seriously: **what do I do with the time and possibility this opens up?**

There is music to make, circuitry to understand, materials science to learn, and medicine to explore. There are connections between these fields that I can only begin to see. I want a public place to follow those inclinations and explain why I am doing the work.

This is that place.

## Starting with the model

Leslie Lamport's [*Thinking Above the Code*](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/07/leslie_lamport.pdf) gives me a useful direction. His argument is about thinking clearly about a system's intended behavior, and using mathematical descriptions to reason about it before getting absorbed in implementation.

I read that as a challenge for my own work: explain what I mean before asking a machine to execute it. The connection to AI is mine. Faster implementation makes that discipline feel more valuable to me, because I can turn a poorly understood idea into a large amount of code very quickly.

The mathematics and theoretical foundations are part of what inspires me. I want to stay sharp with these technologies and get better at thinking above the code.

## A first question I can actually test

I am beginning with GPU kernels and revisiting linear algebra. I have a 4090 and [Mage](https://github.com/superposition/mage), a Python and Triton kernel project with profiling tools. The next step is to add Rust kernels using [cuda-oxide](https://github.com/NVlabs/cuda-oxide) and preserve both workflows.

Matrix multiplication is a good place to start. For an $M \times K$ matrix $A$ and a $K \times N$ matrix $B$:

$$
C_{ij} = \sum_{k=0}^{K-1} A_{ik} B_{kj}.
$$

That equation defines the result. It leaves open how to arrange threads, reuse values in shared memory, handle the edges of a tile, and measure the work accurately. Those choices are where the learning begins.

The [Hacker News discussion](https://news.ycombinator.com/item?id=19055994) of Tim Rocktäschel's [*Einsum Is All You Need*](https://rockt.github.io/2018/04/30/einsum) points at another connection I want to explore: using notation to make tensor operations understandable. Naming the indices makes it easier to see which dimensions survive, which are summed over, and where related operations share a structure.

That does not make a compact expression a fast implementation. It gives me something precise to compare the implementation against.

## The first hypothesis

My working hypothesis is that writing small kernels in Python and Rust, checking them against the same mathematical reference, and examining their profiles will help me understand the relationship between an operation and the hardware that executes it.

The first set covers tiled matrix multiplication, fused bias and GELU, LayerNorm, a triangle contraction, and weighted neighbor aggregation. These operations connect to larger systems in representation learning, proteins, and materials modelling. The experiments are small primitives; they are not reproductions of those complete scientific models.

There is also a hypothesis about the tooling: I should be able to keep a familiar Python workflow while profiling a native Rust executable, and retain enough information that a result can be inspected later.

## What I want the evidence to contain

For each experiment I want to connect a mathematical idea to an observation. Running code is one step; understanding what that run tells me is another.

A fast number is only useful if I understand what it measures. An explanation becomes more useful when someone else can inspect its assumptions and test it.

The [Mage field notes](https://superposition.github.io/mage/experiments/mage-001/) explore the ideas. The [GitHub record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-001-validation.md) holds the code, measurements, and limitations. This journal follows the motivation and what I make of the work. The shared identifier **mage-001** keeps the ideas and evidence connected.

## What comes next

I want to learn how to ask better questions of both the machine and myself. The first milestone is a stable profiling loop for Python and Rust. After that, I can make a change to a kernel and explain why I expect it to matter, then see what happens.

I expect some hypotheses to be wrong. Keeping those changes of understanding is a reason to write this publicly.

If something here makes you curious, or if you see a mistake, I am [@SuprPosition on Telegram](https://t.me/SuprPosition). I would like this notebook to be a starting point for further explanations and conversations.
