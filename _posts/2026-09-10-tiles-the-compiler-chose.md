---
title: "Tiles the compiler chose"
description: A tile compiler met the hand-written kernels on five FP32 operations. It won one, matched another and lost two — and most of the gap in the timing column turned out to be the launch path, not the kernels.
date: 2026-09-10 20:55:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance, cutile]
experiment_id: mage-004
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-004.md
field_note: https://superposition.github.io/mage/experiments/mage-004/
math: true
---
The previous three rounds of this investigation wrote the GPU kernels by hand. Each thread owned a register tile, and the shared-memory layout, the vector width and the barriers were chosen deliberately; the measured wins came from those choices. This round hands the choices to a compiler. [cuTile Rust](https://github.com/NVlabs/cutile-rs) takes *tile* programs — single-threaded code over tiles — and maps them onto warps, blocks, shared memory and tensor cores through CUDA Tile IR.

The question is what the compiler is worth. The answer has two parts, and the second one is the more useful.

## What the kernels cost

Five forward FP32 operations, the same inputs and hashes as the earlier rounds, every output checked against PyTorch with TF32 disabled. GPU kernel time comes from separate Nsight Systems captures of 100 launches; the span around the call comes from CUDA events, three rotating rounds of 100 samples.

| Operation | PyTorch | Triton | cuTile Rust | cuda-oxide Rust |
| --- | --- | --- | --- | --- |
| Matrix multiplication 1024³ | 56.04 | 83.06 | 131.56 | 80.00 |
| Bias + GELU 4096×768 | 15.88 | 7.73 | **8.19** | 11.0 |
| LayerNorm 4096×768 | 11.42 | 8.15 | 10.76 | 10.05 |
| Triangle contraction 128×32 | 28.64 | 102.19 | 116.08 | 80.1 |
| Neighbor aggregation 4096×64×65536 | 67.32 | 7.97 | 35.37 | 10.3 |

*(µs of GPU kernel time per operation. PyTorch's bias + GELU is two kernels, its triangle contraction three and its neighbor aggregation four; the counts come from the capture, not from what the operation should launch.)*

The tile compiler **beats the hand-written kernel on bias + GELU** — 8.19 µs against 11.0 — and lands level on layer norm, 10.76 against 10.05, even though its layer norm pads a row of 768 columns to 1024 because tile dimensions must be powers of two. It trails on the matmul-shaped operations, 1.6× and 1.4×, and by 3.4× on the irregular one, where the safe tile model gave out and the kernel had to reach for raw device pointers.

## The column that was measuring something else

The event span around the call says something different, and worse: 29.97 µs for a bias + GELU whose kernel takes 8.19 µs.

That gap is not the kernel. Each timed iteration records an event, launches, records a second event and synchronizes. For a runtime whose device operations are lazy, that pattern prices the *host submission path*, and the tile runtime's costs 14–23 µs per awaited launch against the hand-written runtime's 2–3 µs. Queue the launches behind one event pair, or capture them into a CUDA graph and replay it, and the spans fall onto the kernel times:

| Operation | single | batched by ten | replayed graph | kernel |
| --- | --- | --- | --- | --- |
| Matrix multiplication 1024³ | 138.24 | 133.02 | **122.87** | 131.56 |
| Bias + GELU 4096×768 | 25.60 | 8.40 | **7.77** | 8.19 |

Bias + GELU replays at 7.77 µs against an 8.19 µs kernel: the host cost that dominated the column is gone. Timed the same way, PyTorch and Triton also improve — Triton by 6–7 µs per call — so with all three launch paths matched the tile kernels' wins and losses are the ones in the first table, and nothing else.

The lesson generalizes past this comparison. A column of "time around the call" is a joint measurement of two things, and when the languages being compared submit their work differently, the cheaper-looking one may simply be the one that blocks less.

## The tile shape, and a search that beat me

The matrix multiply started from the upstream tutorial's 16 × 16 × 8 tile and was slow. Twelve hand-picked configurations, each a separate specialization producing the same output, moved it from 738.0 µs of span to 201.5 µs at 128 × 64 × 8. The shape is not monotone in any dimension: deepening the contraction step from 8 to 32 costs 42% at a 16 × 16 tile but only 6% at 64 × 64, and 128 × 128 × 8 is 2.3× *slower* than 128 × 64 × 8 — the signature of a register or occupancy cliff rather than of arithmetic.

Then the library's own autotuner, given the same powers of two and 36 candidates, chose 32 × 128 × 32 and beat the hand-picked tile in both views: 137.28 against 189.44 µs single-launch, 121.75 against 174.90 batched. The two searches were optimizing different things — mine the span, which includes submission; the tuner kernel time alone — but its answer was better in both. Twelve configurations chosen to trace a ratio are not a search, and the library found the better region in 17 seconds.

## What was tried and not kept

- **A broadcast product instead of `mma`**: the first strict-FP32 formulation multiplied broadcast tiles and reduced, and it did not compile — the tile types would not unify. `mma` on `f32` turned out to keep FP32 accuracy anyway: 1.5e-05 against the strict reference on K = 1024, which is accumulation error, not a 10-bit mantissa's.
- **Deeper K steps at small tiles**: 16 × 16 × 32 measured 1072.4 µs against 738.0 for 16 × 16 × 8.
- **A loop over the triangle contraction's channel axis**: every channel received the first channel's value, because a partition load indexed by a loop variable does not vary. The channel is a grid axis now.
- **One row per program for the whole of layer norm**: it works, but it forces the 768 → 1024 padding; a kernel that could reduce across row tiles would not pay it.

## What the numbers do not establish

No hardware counters were available, so occupancy, register pressure and memory traffic are inferred from ratios rather than read. The cuda-oxide column is the previous round's measurement, not taken in the same session as these numbers. Event spans are sensitive to device contention: a repeat that shared the GPU with another capture measured three to twenty times larger spans for the same binary, and it was caught only because PyTorch's own matmul kernel moved with it. One capture per operation means kernel time carries no interval of its own, clocks are unlocked, and compilation, transfers and process startup are excluded throughout.

The [field note](https://superposition.github.io/mage/experiments/mage-004/) carries the tables in full, and the [technical record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-004.md) has the method, the reproduction commands and the open items.
