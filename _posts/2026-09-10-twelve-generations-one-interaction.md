---
title: "Twelve generations, one interaction"
description: A benchmark that proposes its own kernel variants kept three changes, and the last one turned out to be half of a combination that is faster than either half — after two of its own claims were withdrawn by better measurement.
date: 2026-09-10 19:40:00 -0400
updated: 2026-09-10
tags: [kernels, measurement, performance]
experiment_id: mage-005
technical_record: https://github.com/superposition/mage/blob/master/docs/experiments/mage-005.md
math: true
---
The third field note left the Rust matrix multiply at 80.0 microseconds of GPU kernel time. The change that got it there was chosen by an argument — a deliberately worse tile identified shared-memory load instructions as the limit, and the count of resident threads chose the layer normalization change. Both arguments required a person to make them.

This entry is about what happened when the harness was given the ability to make them instead: propose a variant, build it, check it, measure it against both the configuration it holds and the committed kernel, decide, and write down why. Twelve generations later it had kept three changes. Two of its own claims were withdrawn along the way, and the result was not what its ledger said it was.

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

| staging structure | contraction step | kernel µs | vs committed |
| --- | ---: | ---: | ---: |
| one loop, shared quad decomposition (the committed kernel) | 64 | 80.31 | 1.000 |
| guard-free loops | 64 | 80.29 | 0.999 |
| guard-free loops | 32 | 82.43 | 1.028 |
| one branch per tile | 64 | 82.97 | 1.034 |
| **one branch per tile** | **32** | **76.29** | **0.951** |

The contraction step the loop kept is *slower* in the structure that has no branches, and the branch structure is slower at the old step. Neither change explains the result on its own. The combination is 4.9% faster than the committed kernel, and a loop that measured one change at a time could only reach it by keeping a step whose stated reason — "32 is faster than 64" — was wrong.

That the committed arm reproduced its published value (79.8–81.0 against the recorded 80.00) is what makes the comparison usable at all. Triton's published matmul value swings between 71.94 and 83.78 µs across sessions, wider than any difference being discussed here, so all four implementations were captured in one session:

<figure class="measurement">
  <picture>
    <source media="(max-width: 520px)" srcset="{{ '/mage/assets/figures/mage-005/kernel-time-comparison-mobile.svg' | relative_url }}">
    <img src="{{ '/mage/assets/figures/mage-005/kernel-time-comparison.svg' | relative_url }}" width="740" height="399" alt="Left: GPU kernel time per iteration for four implementations in one session — committed Rust 79.8, evolved Rust 76.3, Triton 84.5, and PyTorch through cuBLAS 49.9 microseconds. Right: the evolved configuration split into its two halves, where guard-free loops at step 32 and one branch per tile at step 64 are both slower than the committed kernel, and only the combination is faster.">
  </picture>
  <figcaption>
    <p>Left: one session, four implementations, with the three round values marked on each bar. Right: the same configuration split into its two halves, each row a paired session. Lower is better.</p>
    <details>
      <summary>Values (µs of GPU kernel time per iteration)</summary>
      <table>
        <caption class="visually-hidden">GPU kernel time per iteration, by implementation and by staging structure</caption>
        <thead><tr><th scope="col">Implementation or structure</th><th scope="col">Rounds</th><th scope="col">Median</th></tr></thead>
        <tbody>
          <tr><th scope="row">Rust, committed</th><td>81.00, 79.24, 79.76</td><td>79.76</td></tr>
          <tr><th scope="row">Rust, evolved</th><td>76.34, 76.34, 75.95</td><td>76.34</td></tr>
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

cuBLAS is 1.53× ahead, and its own spread across three rounds is as wide as the gap, so it is quoted with that caveat rather than presented as a target that was reached.

## Two claims withdrawn

The first claim was that the configuration was about 5% faster. It is 2.47% faster in the event span. The confirmation step had begun cold: on this machine the committed kernel reads 77.82 µs on the first measurement after an idle period and 82.94 µs once its clocks settle, so a three-round confirmation that starts cold reports a gain the configuration does not have. The confirmation now burns in four unrecorded pairs first, keeps two prepared input directories per arm so no round pays a cold-cache cost, runs eight recorded rounds with the arm order alternating, and quotes the median rather than the mean.

The second claim was more subtle, because it was a rule rather than a number. Generations were accepted when the *fastest* round of the candidate beat the fastest round of the holder. Clock-boost excursions of about 10% land on either arm — in one session the candidate read 72.70 µs once and the committed kernel 77.82 µs once — so a single boosted round could carry a generation: a candidate with rounds 80, 100, 100 against a holder of 100, 100, 100 was accepted at 0.80. The rule now judges the median of the paired per-round ratios, where an excursion perturbs one ratio out of three instead of one arm.

A third finding is recorded rather than explained. The first kernel-time capture ran about sixty times slower than every later one — 846 seconds against 14 for the same work — and read no gain at all, with the committed arm normal. Four later sessions and two structural sessions disagreed with it. It stays in the evidence directory.

## A null result as well

The same loop on layer normalization ran four generations and kept none. One warp per row measured 13.07 µs against 12.29; four warps per row and 128-thread blocks both measured 12.29 against 12.29; 512-thread blocks measured 13.31. One generation was refused outright because the committed control drifted 12.5% inside it.

The committed arrangement — two warps per row in a 256-thread block — is a local optimum in that space, and the loop says so instead of manufacturing a change. The distance to Triton's layer normalization kernel, 10.05 against 7.99 µs, is not reachable by re-assigning the existing work. It needs a different decomposition, which is a different kind of proposal than the ones this loop can make.

That work did surface a real defect. The two-warp kernel splits a row in whole 32-lane steps, which counts part of the row twice whenever each warp's span is not a multiple of 32. Width 768 (span 96) hid it; width 128 was wrong by 0.43. The host now keeps that kernel to widths it can share and otherwise takes the single-warp kernel, whose every access is guarded.

## What the numbers do not establish

One shape, 1024³, one dtype, FP32, one GPU with unlocked clocks. Nothing here speaks to training shapes or to another device. No hardware counters were available, so the interaction is *attributed* by paired captures and not *explained* by a bounded resource — the guard branches are the only structural difference between the two forms that bracket the result at the same contraction step, and why they help is open. And the loop optimizes what it measures: every kept step improved the event span, only the final configuration also improved kernel time, and the loop could not tell those apart while it was running.

## Measured values

Kernel time per iteration, 1024³ FP32, Nsight Systems captures of 100 iterations, three interleaved rounds, medians: committed Rust **79.76 µs**, evolved Rust **76.34 µs**, Triton **84.51 µs**, PyTorch through cuBLAS **49.88 µs**. The interaction, one paired session per row: guard-free at step 32 **82.43**, one branch per tile at step 64 **82.97**, one branch per tile at step 32 **76.29**.

The loop's own view — event spans around the call — and the twelve-generation ledger with its rejections are in the [measurement record](https://github.com/superposition/mage/blob/master/docs/experiments/mage-005.md), along with the search space, the static constraints, the audit that renders and checks all 51 reachable configurations, and the regression tests. The captures are one file per paired session under `docs/assets/results/evolution-loop/kernel-time/`.
