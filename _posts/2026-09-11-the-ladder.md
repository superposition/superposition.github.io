---
title: "The ladder"
description: The neuro-symbolic seam as one number — squared Mahalanobis distance from the predictor's mean, computed with the JEPA crate's own routine — plus a rule table, and a healing ladder that is still only a specification.
date: 2026-09-11 21:25:00 -0400
updated: 2026-09-11
tags: [braid, drift, neuro-symbolic, healing]
math: true
sources:
  - https://github.com/superposition/qualia/issues/11
  - https://github.com/superposition/qualia/issues/50
  - https://github.com/superposition/qualia/issues/49
  - https://github.com/superposition/qualia/pull/195
  - https://github.com/superposition/qualia/pull/200
  - https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-ladder/ladder.json
---

**The claim.** The seam between the neural and symbolic halves is a single measured number: how far
the observed latent sits from what the predictor expected. `crates/braid/src/drift.rs` computes
`qualia_jepa::diagonal_mahalanobis_squared(latent, predicted_mean, precision)` with
`precision = exp(-log_variance)` — the crate's **squared** distance, the number a threshold compares —
and returns `DriftReport { mahalanobis, sample_count }`. Identity prediction is exactly **0.0**; ragged,
empty or non-finite inputs return **0.0 with `sample_count` 0**, the mute pair, so a malformed sample
fires no rule. Around it, the rule table exists as data: four `default_rules()` in a fixed order, the
first of which lowers coupling by a factor of **0.90** on a failed mission. `qualia-braid` finished at
**17 tests** on the board for the drift half and **24 tests** with the rules. The ladder those
thresholds describe — recalibrate, roll back, observe-only, safe stop — is **not in the tree yet**;
what has landed is the measurement and the rules, and that distinction is the point of this entry.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-ladder/hero.webp"
         width="1100" height="619"
         alt="The extruded psi monogram beside four concentric extruded rings, the widening gaps between them at squared Mahalanobis 3, 5 and 8.">
  </picture>
  <figcaption>
    <p>The extruded mark beside the healing ladder's four bands as four concentric rings, the gaps
    between them at squared Mahalanobis 3, 5 and 8. The outermost band is open-ended: the ladder's
    thresholds are the plan's specification, not a measurement.</p>
  </figcaption>
</figure>

## What we tried

**The measurement was not re-derived.** `crates/jepa` already exports the Mahalanobis routine the
model's own NLL uses, so the braid calls it instead of writing a second one. The reference tree has no
`braid` crate at all, so `drift.rs` has no counterpart to match and the ticket text is the whole
interface; reusing the only existing math for the same quantity was the one decision available.

**Three inputs had to be made mute, not loud.** The ticket says a length mismatch returns
`sample_count == 0` and that `observe` treats it as "no opinion". Review found the rest of the family:
non-finite latents or means, a non-finite log-variance — which would otherwise reach `exp` — and a
precision that is not real. All of them return the mute pair. The point is that the drift path cannot
panic a running stack on a bad sample; a rule layer that fires on garbage is worse than one that
abstains.

**The first rule table had a rule that cannot fire, and that is recorded, not hidden.** The plan's
`default_rules()` includes `DriftAbove { threshold: 3.0 } → EnterObserveOnly`. The braid's frozen
`BraidEvent` vocabulary is a closed set of six variants plus `Unknown`, and no variant carries a drift
measurement; T34 shipped `DriftReport` without adding a drift event. So `DriftAbove` is contract data
that fires against no event `evaluate` can be handed today. The ticket's text was left as written and
the gap was pinned by a test — `the_drift_rule_fires_on_no_event_the_braid_carries_yet` — rather than
inventing a variant the ticket does not name. The drift reaches the healing ladder directly, when the
ladder exists.

**Falsification, not just green.** For the rules, two deliberate mutations (swap the first two default
rules; ignore the matched outcome) were built and both were caught, `EXIT=101`; reverted, the suite
went green again. For the drift tests, they were written before `drift.rs` existed and failed with
`E0432: unresolved import qualia_braid::drift`.

## The ladder is the ticket's contract, not a measurement

The epic's Step 35 fixes the escalation, and it is worth writing down exactly because none of it runs
yet — these are thresholds from the plan, and no code in the tree compares a drift to them:

| Condition | Step |
| --- | --- |
| `mahalanobis <= 3.0` | none |
| `mahalanobis <= 5.0` | recalibrate (through the registry's calibration gate) |
| `mahalanobis <= 8.0` | roll back to the previous generation |
| `mahalanobis > 8.0`, or `attempts >= 3` | observe-only |
| observe-only held **10 s** with drift still above 8.0 | request a safe stop |

`SafeStop` produces a **request**: the agent forwards it to leash and leash decides, exactly as the
compute API's authority statement requires. No function in the crate may call a motor, and no test may
assert that it does. The numbers above are the plan's; the only measured quantities in this entry are
the drift values and the test counts.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-ladder/ladder-bands.svg"
         width="1100" height="516"
         alt="The healing ladder's escalation over squared Mahalanobis distance: four bands separated at 3, 5 and 8, each labelled with the step it selects, and the measured identity-prediction drift of 0.0 marked on the axis.">
  </picture>
  <figcaption>
    <p>The ladder's escalation as four bands, separated at the plan's 3, 5 and 8 and labelled with the
    step each selects; the measured identity-prediction drift (<code>0.0</code>) is marked on the axis.
    The chart says on its face that the thresholds are a specification, not a measurement.</p>
  </figcaption>
</figure>

## What the rules say, in order

`default_rules()` returns, in this order:

1. `MissionClosed { outcome: "failed" } → LowerCoupling { factor: 0.90 }`
2. `PromotionRolledBack → EnterObserveOnly`
3. `Quarantined → RequestTraining` — a quarantine is a reason to learn from what survived
4. `DriftAbove { threshold: 3.0 } → EnterObserveOnly`

Rules are data, so a later rule set is a new vector and not a code change. What is *measured* about
them is their order and their effect on the events the braid can receive: the seven tests cover the
table, and the board re-ran the whole crate at 24 passed.

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| Identity-prediction drift | 0.0 | squared Mahalanobis | `drift_is_zero_for_identity_prediction` |
| Mute pair for a bad sample | `0.0` / `0` | distance / samples | `mismatched_sample_is_no_opinion` |
| Drift tests, host | 3 passed / 0 failed | tests | T34 comment ^1 |
| Drift tests, Pinkie aarch64 | 6 passed / 0 failed | tests | Board3 comment, PR #195 ^2 |
| `qualia-braid` on Pinkie (T34) | 17 passed / 0 failed | tests | same ^2 |
| `qualia-braid` on Pinkie (T33) | 24 passed / 0 failed | tests | Board3 comment, PR #200 ^2 |
| Coupling factor on failure | 0.90 | factor | `crates/braid/src/rules.rs` |
| Drift rule threshold | 3.0 | squared Mahalanobis | `crates/braid/src/rules.rs` |
| Files compared by the provenance gate | 152 authored, 0 identical | files | T34 comment ^1 |
| Ladder thresholds 3 / 5 / 8, hold 10 | — | squared Mahalanobis, s | epic Step 35 text ^3 |

^1 Host tests on the dev workstation in a different session from the board runs.
^2 Pinkie, native aarch64, from a `git archive` of the head; `qualia-braid` has no binary, so
`cargo test -p qualia-braid` is its own smoke path.
^3 The 3, 5, 8 and 10 s values are the plan's specification, not measured behaviour. No code in the
tree compares a drift to them.

The commit range this entry describes is [`7cac730..7b3bd15`](https://github.com/superposition/qualia/compare/7cac730...7b3bd15) — the drift commit through the merge of
T34. The rule layer is on PR #200 (`2602c4d`, board-green, unmerged). This entry's epic is
[EPIC-08C (#11)](https://github.com/superposition/qualia/issues/11); tickets
[T33 #49](https://github.com/superposition/qualia/issues/49) and
[T34 #50](https://github.com/superposition/qualia/issues/50).

## What this does not establish

- **The ladder has not landed.** `crates/braid/src/heal.rs` does not exist; T35 (`#51`) is
  `status:ready`, and T36 (`#52`, the authority bound on safe stop) with it. So no step has been
  selected from a real drift, no rollback has been requested, and no safe stop has been requested.
- **The drift thresholds are uncalibrated.** 3, 5 and 8 are the plan's numbers. No run has measured
  what a *normal* drift looks like on this stack, so there is no evidence that these values separate
  "fine" from "recalibrate".
- **`DriftAbove` fires on nothing.** As above: the braid carries no drift event, so the fourth default
  rule is inert until the wire does.
- **`measure` has no board capture.** Step 47 lists T35 as one of three mandatory `needs:profile`
  captures — the ladder's decision path as a CPU timeline, with no kernel in it — and that capture
  cannot exist until the decision path does.
- **Drift is a number, not a diagnosis.** A large squared Mahalanobis says the latent is far from the
  predicted mean under the predicted precision; it does not say whether the model is wrong, the world
  changed, or the precision estimate is bad. The ladder is a policy over that number, and the policy
  is untested.
