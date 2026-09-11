---
title: "Twelve generations, one diagnosis"
description: A benchmark that proposes its own kernel variants kept three changes. What it produced was not a faster kernel but a diagnosis about where the time waits — and a hand-written pipeline then answered it, 11% further on.
date: 2026-09-10 19:40:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-005
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-005.md
math: true
---
The third field note left the Rust matrix multiply at 80.0 microseconds of GPU kernel time. The change that got it there was chosen by an argument — a deliberately worse tile identified shared-memory load instructions as the limit, and the count of resident threads chose the layer normalization change. Both arguments required a person to make them.

This entry is about what happened when the harness was given the ability to make them instead: propose a variant, build it, check it, measure it against both the configuration it holds and the committed kernel, decide, and write down why. Twelve generations later it had kept three changes. Two of its own claims were withdrawn along the way — and what it produced in the end was not a faster kernel but a **diagnosis**, which a hand-written pipeline then answered by going 11% further.

## The question

Can the benchmark close its own loop? Not "can a search run" — a sweep over parameters is not interesting on its own. The interesting version is the one where every kept change has a recorded reason and every rejected one has a recorded number, because that record is what a proposer could learn from later and what a reader can audit now.

The loop never edits the committed kernels. It renders a separate generated module from templates in two roles — `best`, what it holds, and `new`, the proposal — so one build contains both and both are measured under identical conditions in the same round. A manifest field picks which one runs; a manifest without it runs the committed kernels, which is how the earlier field notes stay reproducible.

Knobs: whether $A$ is staged k-major so a thread's four rows arrive in one 128-bit read, whether staging loads are quads or scalars, which of three staging structures is used (one loop sharing a quad decomposition, guard-free loops, or one branch per tile), the depth of the contraction step, the block and register tiles, and for layer normalization the warps per row and the block size.

A proposal is checked against the geometry it implies before anything is compiled — the 48 KB static shared-memory budget, whole-warp thread counts, four-element alignment, and the preconditions of each staging form. A 128-deep step at the default tile is refused this way, which costs a function call instead of a build.

## What it found

Started from the arrangement the first field note measured — row-major $A$, scalar staging, a 64-deep contraction step — it took three of twelve generations. Time around the call, which is what it measures:

| Generation | Change | Before | After | Decision |
| ---: | --- | ---: | ---: | --- |
| 1 | stage $A$ k-major | 119.81 µs | 93.18 µs | keep |
| 2 | stage through 128-bit quads | 93.18 µs | 84.99 µs | keep |
| 4 | contraction step 64 → 32 | 84.99 µs | 78.59 µs | keep |
| 3, 5–7 | the same knobs reversed, step 16 | — | 81.9–108.3 µs | reject |
| 9–12 | 128 × 64 and 64 × 128 tiles, other staging forms | — | 83.8–84.7 µs | reject |

The first two are the changes the third field note chose by hand, and the loop found them from measurements alone, in the same order. That was the test it had to pass before any of its other results meant anything.

The third is where it disagreed with the published record. The earlier captures had measured a 32 → 64 step as a *gain*; the loop measured 64 → 32 as a gain. One of the two was wrong, and deciding which one required a different instrument.

## The win was a combination

The field notes quote GPU kernel time from Nsight Systems captures. The loop quotes the event span around the call. Re-capturing the retained configuration with the published instrument, in paired sessions:

| staging structure | contraction step | kernel µs | vs that session |
| --- | ---: | ---: | ---: |
| one loop, shared quad decomposition (the committed kernel then) | 64 | 80.31 | 1.000 |
| guard-free loops | 64 | 80.29 | 0.999 |
| guard-free loops | 32 | 82.43 | 1.028 |
| one branch per tile | 64 | 82.97 | 1.034 |
| **one branch per tile** | **32** | **76.29** | **0.951** |

The contraction step the loop kept is *slower* in the structure that has no branches, and the branch structure is slower at the old step. Neither change explains the result on its own. The combination was 4.9% faster than the kernel of that session — and a loop that measured one change at a time could only reach it by keeping a step whose stated reason, "32 is faster than 64", was wrong.

Look again at what those two structures differ in. They load the same tiles from the same places, in the same order, into the same shared memory. The only difference is how the copies are issued: one form puts the $A$ and $B$ copies in a single basic block, the other separates them behind their own predicates. An 8% difference between two arrangements that move identical bytes is a statement about **where the time waits** — not about arithmetic, and not about how much memory traffic there is.

## What answered it

That diagnosis had a consequence nobody in the loop could act on: the generated templates have no way to express asynchronous copies. A hand-written kernel does. `tiled_matmul_pipeline` double-buffers the shared memory and issues the next K tile's global-to-shared copies with `cp.async` while the current tile is still being multiplied, so the load latency overlaps the arithmetic instead of preceding it.

| Implementation | Three rounds (µs/iter) | Median |
| --- | --- | ---: |
| **Rust, committed (`tiled_matmul_pipeline`)** | 69.02, 68.76, 68.44 | **68.76** |
| Rust, the configuration the loop retained | 77.09, 76.25, 76.09 | 76.25 |
| Triton (`matrix_kernel`) | 79.32, 86.22, 86.50 | 86.22 |
| PyTorch → cuBLAS (`cutlass simt sgemm 128x64`) | 49.26, 50.50, 56.03 | 50.50 |

The pipeline is 11% faster than the configuration the loop retained, and 13.8% faster than the kernel it replaced (79.76 µs in the earlier session). So the loop's kernel is superseded on this shape, and that is the honest reading of its contribution: it produced the question the pipeline answers.

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-005/kernel-time-comparison-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-005/kernel-time-comparison.svg' | relative_url }}" width="740" height="399" alt="Left: GPU kernel time per iteration for the committed matrix multiply at 79.76 microseconds, the configuration the loop retained at 76.34, and the pipelined kernel at 68.76, with reference lines for Triton at 86.2 and cuBLAS at 50.5. Right: the retained configuration split into its two halves, where guard-free loops at step 32 measure 82.43 and one branch per tile at step 64 measures 82.97, both slower than the committed kernel of that session at 80.31, while the combination measures 76.29.">
  </picture>
  <figcaption>
    <p>Left: the three Rust kernels, with the library references from the same sessions. Right: the retained configuration split into its two halves, each row a paired session against the kernel as it stood before the pipeline landed. Lower is better.</p>
    <details>
      <summary>Values (µs of GPU kernel time per iteration)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per iteration, by kernel and by staging structure</caption>
        <thead><tr><th scope="col">Kernel or structure</th><th scope="col">Rounds</th><th scope="col">Median</th></tr></thead>
        <tbody>
          <tr><th scope="row">Rust, committed (registers)</th><td>81.00, 79.24, 79.76</td><td>79.76</td></tr>
          <tr><th scope="row">Rust, the loop's configuration</th><td>76.34, 76.34, 75.95</td><td>76.34</td></tr>
          <tr><th scope="row">Rust, pipelined</th><td>69.02, 68.76, 68.44</td><td>68.76</td></tr>
          <tr><th scope="row">Triton</th><td>88.95, 80.04, 84.51</td><td>84.51</td></tr>
          <tr><th scope="row">PyTorch / cuBLAS</th><td>49.88, 43.51, 50.54</td><td>49.88</td></tr>
          <tr><th scope="row">guard-free, step 32</th><td colspan="2">82.43</td></tr>
          <tr><th scope="row">branch per tile, step 64</th><td colspan="2">82.97</td></tr>
          <tr><th scope="row">branch per tile, step 32</th><td colspan="2">76.29</td></tr>
        </tbody>
      </table>
    </details>
  </figcaption>
</figure>

Triton's published matmul value swings between 71.94 and 83.78 µs across sessions, wider than most of the differences being discussed, so it is captured in the same session rather than compared across them. cuBLAS is 1.36× ahead of the best Rust kernel, and its own spread across three rounds is as wide as some of the gaps here, so it is quoted with that caveat.

## Two claims withdrawn

The first claim was that the configuration was about 5% faster. It is 2.47% faster in the event span. The confirmation step had begun cold: on this machine the committed kernel reads 77.82 µs on the first measurement after an idle period and 82.94 µs once its clocks settle, so a three-round confirmation that starts cold reports a gain the configuration does not have. The confirmation now burns in four unrecorded pairs first, keeps two prepared input directories per arm so no round pays a cold-cache cost, runs eight recorded rounds with the arm order alternating, and quotes the median rather than the mean.

The second claim was more subtle, because it was a rule rather than a number. Generations were accepted when the *fastest* round of the candidate beat the fastest round of the holder. Clock-boost excursions of about 10% land on either arm — in one session the candidate read 72.70 µs once and the committed kernel 77.82 µs once — so a single boosted round could carry a generation: a candidate with rounds 80, 100, 100 against a holder of 100, 100, 100 was accepted at 0.80. The rule now judges the median of the paired per-round ratios, where an excursion perturbs one ratio out of three instead of one arm.

A third finding is recorded rather than explained. The first kernel-time capture ran about sixty times slower than every later one — 846 seconds against 14 for the same work — and read no gain at all, with the committed arm normal. Four later sessions and two structural sessions disagreed with it. It stays in the evidence directory.

## A null result as well

The same loop on layer normalization ran four generations and kept none. One warp per row measured 13.07 µs against 12.29; four warps per row and 128-thread blocks both measured 12.29 against 12.29; 512-thread blocks measured 13.31. One generation was refused outright because the committed control drifted 12.5% inside it.

The committed arrangement — two warps per row in a 256-thread block — is a local optimum in that space, and the loop says so instead of manufacturing a change.

A block-per-row kernel then went where the loop could not (`layer_norm_row`): a quad held per thread plus a masked tail, four warps reduced with shuffles behind one barrier, and the approximate reciprocal square root. Captured in one session, kernel microseconds per iteration: **8.84** committed against **8.23** for Triton, where the configuration the loop held measures **10.35**. The committed kernel is 7% behind Triton; the generated one is 26% behind. The remaining distance needed a different decomposition rather than a different split of the same work — the second time that has been true, after `cp.async` for the matrix multiply, and both times the templates had no way to express it.

That work did surface a real defect. The two-warp kernel splits a row in whole 32-lane steps, which counts part of the row twice whenever each warp's span is not a multiple of 32. Width 768 (span 96) hid it; width 128 was wrong by 0.43. The host now keeps that kernel to widths it can share and otherwise takes the single-warp kernel, whose every access is guarded.

## What the numbers do not establish

One shape, 1024³, one dtype, FP32, one GPU with unlocked clocks. Nothing here speaks to training shapes or to another device. No hardware counters were available, so the interaction is *attributed* by paired captures and not *explained* by a bounded resource — the pipeline's win suggests the answer lies in where the copies wait rather than in how many there are, but that is an inference from two measurements, not a counter reading. And the loop optimizes what it measures: every kept step improved the event span, only the retained configuration also improved kernel time, and it never proposed anything structural — no `cp.async`, no split-K — because its templates cannot express them.

## Measured values

Kernel time per iteration, 1024³ FP32, Nsight Systems captures of 100 iterations, three interleaved rounds, medians: committed Rust with registers **79.76 µs**, the loop's configuration **76.34 µs**, the pipelined kernel **68.76 µs**, Triton **84.51–86.22 µs** across the two sessions, PyTorch through cuBLAS **49.88–50.50 µs**. The interaction, one paired session per row, against the pre-pipeline kernel: guard-free at step 32 **82.43**, one branch per tile at step 64 **82.97**, one branch per tile at step 32 **76.29**.

The loop's own view — event spans around the call — and the twelve-generation ledger with its rejections are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-005.md), along with the search space, the static constraints, the audit that renders and checks all 51 reachable configurations, and the regression tests. The captures are one file per paired session under `docs/assets/results/evolution-loop/kernel-time/`, and the next thing to add is a `cp.async` form to the generated templates so the loop can be asked to tune inside the pipelined structure.
