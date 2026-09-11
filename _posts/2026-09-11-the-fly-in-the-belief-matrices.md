---
title: "The fly in the belief matrices"
description: A connectome prior loaded, digest-checked, coupled into the belief layers behind an off-by-default feature, and watching its own rate model publish observe-only — seven tickets, a 1.75 coupling total on the 4090, and three CUDA kernels measured at 2.50, 10.59 and 11.84 µs.
date: 2026-09-11 21:10:00 -0400
updated: 2026-09-11
tags: [connectome, cuda, coupling, belief]
math: true
sources:
  - https://github.com/superposition/qualia/issues/4
  - https://github.com/superposition/qualia/issues/5
  - https://github.com/superposition/qualia/issues/6
  - https://github.com/superposition/qualia/pull/190
  - https://github.com/superposition/qualia/pull/189
  - https://raw.githubusercontent.com/superposition/qualia/main/docs/evidence/T16/three-kernels/README.md
---

**The claim.** The prior is now a number in the belief loop and a number on the GPU, and neither
number can move a motor. `CouplingPrior::load` verifies the producer's three section digests — and the
size the counts imply — before it decodes anything; `couple` scales each mapped belief slot by its
type's in-strength normalised by the peak, and returns the total applied. On the 4090, with a fixture
whose in-strengths are 4, 8 and 2, that total printed **`fly prior: applied 1.75` once per tick**
(0.5 + 1.0 + 0.25), 162 lines in about 5 s — and the arithmetic is normalised, so the value is a
weight, not a count. Behind it: the flag `fly-prior`, **off by default**, under which both backends
return `Ok(0.0)` for every input; an invented rate model in a separate crate behind a second
off-by-default feature; and three new kernels measured on the 4090 at **2.50 µs** (`belief_couple`,
1 × 4), **10.59 µs** (`action_score`, 2 × 256) and **11.84 µs** (`perception_voxel`, 48 × 256).

## What we tried

**A signature that could not work on one of the two backends was changed, and said so.** The plan's
step 11 gives Metal the same `couple_prior(ctx, prior, slots)`. `MetalContext` is macOS-only, the
coupling is host-side data (D-001), and the Metal belief loop holds no `MetalCognitionStack` — building
one to pass it here would allocate and initialise the whole layer set for a host-side sum. The shipped
Metal signature is `couple_prior(prior, slots)`, same name, same feature, no context.

**The per-tick call moved out of the runner.** Step 12 puts `couple_prior` in each belief runner's
`src/main.rs`; those are pure dispatchers, and `runners/l3-belief`'s own test pins that the runner must
not touch the layer slot. The mode, the prior load and the diagnostics stay in the runners; the
per-tick coupling is wired where the loop is, in the compute backends, behind the same feature. The
reference tree has no `QUALIA_FLY_*` and no coupling, so no reference behaviour could decide this; the
plan's intent — a per-tick coupled belief under `QUALIA_FLY_MODE` — could not be reached from a
dispatcher.

**A stacked PR stranded a ticket, and it was replayed rather than re-invented.** `#27` (T12) was
opened with base `ticket/T11` and merged into that branch; when `ticket/T11` was later rebased onto
`main`, the rebase dropped the merge commit and with it T12's commits, so the work was an ancestor of
neither. That is now decision D-019, and the replay (`ticket/T12-replay`, PR #198) is a single
`cherry-pick -x` of the reviewed commit. It is open, not merged.

**The simulator was kept away from the motor path by construction.** The dataset carries no dynamics
and no sign; the model is invented. So it is a separate crate (`qualia-fly-circuit`, feature `sim`
off by default) whose README says in one paragraph that it is a rate model over a graph, not a
connectome simulation; its weights are used as positive because the artifact carries no sign; and a
build without the feature compiles an empty crate with no dependencies.

## Coupling is a normalisation, and the observable is the total

$$\text{applied} \;=\; \sum_{i \in \text{slots}} \frac{\text{strength}(type_i)}{\max_j \text{strength}(type_j)}$$

Two consequences are worth separating. First, the value is bounded by the slot count and reaches 1.0
only for a uniformly innervated graph — the same property that later made a naive "sum, then clamp to
0..1" reading a de-facto boolean, so the exploration ticket divides by the coupled-type count (the
mean applied weight) instead. Second, the prior cannot silently half-apply: a mapping the graph or
the layer cannot satisfy is refused with `UnknownType(u32)` or `SlotOutOfRange(usize)`, not skipped,
so a stale mapping cannot read as a partial success. With the feature off, the symbol exists and
returns `Ok(0.0)`; there is no branch in the belief loop.

The honest limit, recorded on the ticket: on an idle stack the coupling's effect on the *published*
belief is not separately observable — the belief starts at zero and the identity model keeps it there,
and the coupling scales the mean. The observable is the per-tick total above plus the unit test that
pins the normalised scaling.

## The board and the GPU

Two independent exercises, and they measured different things.

**The Orin NX (aarch64).** `qualia-cuda --features fly-prior` → **29 passed / 0 failed**, including
`coupling_applies_the_prior_by_type_strength` and `coupling_refuses_an_unmappable_slot`;
`qualia-metal --features fly-prior` → **15 passed** (the platform-independent CPU fallback; no Metal
device is claimed on Linux). The coupling tests opened a real `CudaContext` — no `skipping` line — and
the artifact was an ELF aarch64 binary. The `FlySimSlot` half landed separately on the board:
`qualia-jepa-runtime --features sim` → **8 passed** plus 2 smoke tests, with
`fly_sim_publishes_only_while_observe_only_is_approved` publishing `sim_step` 1 then 2 into
`SHM_VERSION` 3's slot, and a smoke start that printed `fly sim: disabled (QUALIA_FLY_PRIOR_PATH is
unset)`.

**The 4090.** The three new kernels ran once each in a single-threaded capture under Nsight Systems
(WSL2 host, `nsys 2025.3.2.474`, `mage 0.1.0`): 16 launches over 8 kernels, **4892.89 µs** of kernel
time, of which the new three are 2.50 µs (`belief_couple`), 10.59 µs (`action_score`) and 11.84 µs
(`perception_voxel`). That capture is committed under `docs/evidence/T16/three-kernels/` and is the
number T17 and T18 have to beat. It replaced a 5-kernel baseline of **4784.75 µs** / 13 launches
(`docs/evidence/baseline-2026-09-11/`, at `76143f0`).

The ABI for the simulator's slot is fully pinned: `FlySimPayload` is `repr(C, align(64))`, 65,984
bytes, with a 65,536-byte state array (`FLY_SIM_MAX_TYPES` = 16,384 `f32`) and `SHM_VERSION` bumped
2 → 3. The payload carries no coupling gain — the model keeps `gain` private, so an observer cannot
be handed a value the writer cannot read.

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| Fixture coupling total per tick | 1.75 | weight | T12 comment (RTX 4090 smoke) ^1 |
| Fixture in-strengths | 4, 8, 2 (peak 8) | weight | T12 comment ^1 |
| cuda `fly-prior` tests on Pinkie | 29 passed / 0 failed | tests | Board3 comment, PR #190 |
| metal `fly-prior` tests on Pinkie | 15 passed / 0 failed | tests | same |
| jepa-runtime `sim` tests on Pinkie | 8 + 2 passed | tests | Board3 comment, PR #189 |
| `FlySimPayload` size | 65,984 | bytes | T15 ABI table |
| `FLY_SIM_MAX_TYPES` | 16,384 | types | T15 ABI table |
| `SHM_VERSION` after T15 | 3 | version | T15 comment |
| `belief_couple` on 4090 | 2.50 | µs/launch | `docs/evidence/T16/three-kernels/README.md` ^2 |
| `action_score` on 4090 | 10.59 | µs/launch | same ^2 |
| `perception_voxel` on 4090 | 11.84 | µs/launch | same ^2 |
| Capture total (8 kernels) | 4892.89 | µs | same ^2 |
| Prior capture total (5 kernels) | 4784.75 | µs | `docs/evidence/baseline-2026-09-11/README.md` ^2 |

^1 Measured on the host's RTX 4090 in a different session from the board runs; the value is the
fixture prior's total, not a dataset-scale coupling.
^2 Both captures are from different sessions and different hardware: the T16 capture is the RTX 4090
under `nsys` on WSL2; the baseline is the same host before the three kernels existed. Durations on a
shared 4090 are one contended sample; launch count and shape are the stable part.

The commit range this entry describes is [`5999ba4..b13ca80`](https://github.com/superposition/qualia/compare/5999ba4...b13ca80) — the first coupling commit through the
merge that put the backend `couple_prior` on `main`. Epics:
[EPIC-04 (#4)](https://github.com/superposition/qualia/issues/4),
[EPIC-05 (#5)](https://github.com/superposition/qualia/issues/5),
[EPIC-06 (#6)](https://github.com/superposition/qualia/issues/6).

<!-- ASK: which committed figure pair (one chart, one diagram or render) ships with this entry? No docs/figures/ directory exists for the slug the-fly-in-the-belief-matrices — T38/T42/T43 own figures. The 4090 kernel durations and the coupling normalisation are the likely chart; the flag/prior/backend boundary is the likely diagram. -->

## What this does not establish

- **T17 and T18 have not landed.** CPU/CUDA parity for the three new kernels is `status:ready`
  (`#32`), and the ≤ 6 GiB memory plan and the `sm_87`/`sm_89` fatbin targets are `status:ready`
  (`#33`). The three kernels have host oracles and a capture, not a parity assertion, and no fatbin
  for the board exists yet.
- **T12 is not on `main`.** The runner wiring that reads `QUALIA_FLY_MODE` and loads the prior at
  start-up is a replay on PR #198, still open. What is on `main` today is the backend coupling, the
  manifests' env keys and the tests.
- **`semantic_novelty` and dimorphism are not derivable.** The artifact aggregates dimorphism away and
  the runtime carries no cell-to-type map; the exploration ticket sends a documented `0.0`.
- **The simulator has no drive.** Nothing in the JEPA path is an input to the type graph, so the
  published state is the model's resting state with a zeros drive — stated in the code, not hidden.
- **`couple`'s effect on published belief is unobserved on an idle stack** (see above). The per-tick
  total and the unit tests are the evidence; a mission that moves the belief has not been run.
- **The 4090 numbers are one contended session.** No error bar and no repeated-run spread are
  recorded in the T16 capture; compare shape and launch count first.
