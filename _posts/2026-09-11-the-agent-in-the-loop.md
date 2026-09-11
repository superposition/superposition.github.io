---
title: "The agent in the loop"
description: A braid that stores nothing, a write edge invented because two strands are separate processes, a belief clock that lets the map degrade instead of stopping, and an exploration mission that opens itself — with an uncertainty weight of 0.625 measured on the robot.
date: 2026-09-11 21:20:00 -0400
updated: 2026-09-11
tags: [braid, agent, missions, pacing]
math: false
sources:
  - https://github.com/superposition/qualia/issues/7
  - https://github.com/superposition/qualia/issues/8
  - https://github.com/superposition/qualia/issues/9
  - https://github.com/superposition/qualia/pull/196
  - https://github.com/superposition/qualia/pull/184
---

**The claim.** The agent now has one place where strands report and one view they report into. The
braid is a state machine plus a dispatch and **stores nothing** — the durable copies stay in MCAP,
SQLite and the registry; `observe` is the only mutator. Two of the three strands are separate
processes and cannot call it in the agent's address space, so the ticket grew a write edge:
`POST /braid` carrying the frozen `BraidEvent` envelope, beside the read `GET /braid`. The board
accepted it: with the TLS surface up, `POST /braid mission_opened` returned **HTTP 200** and the
follow-up read showed `open_missions` **0 → 1**; `GET /braid` answers
`{"schema_version":"qualia.braid-state.v1", …}`. On the same board, `qualia-agent` finished at
**41 passed / 0 failed**. And the fly is in the loop quantitatively: at stack start the runner opens
`explore-frontier` and sends `fly prior: risk uncertainty_weight=0.625 semantic_novelty=0`.

## What we tried

**The rollback dispatch was deferred, with a failing test to prove it.** Step 19 says `observe` calls
the registry's existing rollback. The fixed interface,
`observe(state: &mut BraidState, event: &BraidEvent)`, is synchronous and carries a
`PromotionRolledBack { generation, reason }` with no registry handle and no generation-pointer path;
the registry itself had only a `[[bin]]` target and a `fn main() {}` at the time, so
`cargo tree -p qualia-braid` warned about a dependency with no lib target. Rather than change the
interface the ticket fixes, T19 keeps the state transition (the generation moves, `last_promotion_ns`
does not) and the **reason stays on the wire**, asserted by a test that decodes the envelope. The call
moves to C10 (`#76`) and the routing to T22 (`#37`). A temporary test asserting the braid records the
reason was written first, failed as expected, and was removed; the committed assertion is the one that
stays true.

**The braid's event vocabulary resisted invention.** T19 added one variant, `Unknown`, marked
`#[serde(other)]`, so a future event decodes and leaves the state untouched — the forward-compatibility
arm the epic's own test asks for.

**The read-only write edge.** The literal step — every strand calls `observe` itself — is impossible
for `arena-recorder` and `jepa-runtime`, which are processes. Main ruled the write edge into the
ticket: body is `crates/braid`'s frozen envelope, reply is the view `GET /braid` returns, a failed
dispatch is `503`, and `AuthScope::Peer` (already loopback-bypassed) means co-located runners need no
new secret. The agent's `src/braid.rs` dropped its local mirror of the braid types and now holds the
one `BraidState` the process owns.

**Board hygiene was found the hard way.** Two later suites died with `SIGBUS` because the board's
`/dev/shm` was **100 % full** — 33 stale 64 MiB `qualia*` test regions, about 1.8 GB, owned by no live
process. After `rm -f /dev/shm/qualia*` (100 % → 1 %) the same commands were green. It is reported in
the board comment and every later board leg checks `df -h /dev/shm` first. A parallel test-isolation
defect (`ShmError::OsError(17)` from two smoke tests naming one region) was fixed with a per-test
region name and re-run green.

## Pacing: the map degrades, it does not stop

`QUALIA_BELIEF_PACE_MS` (default **250**) gates `runners/map` and `runners/pose`: before publishing,
wait until the newest accepted belief commit is younger than the window; if none has been committed
for **8×** the window, publish anyway and log
`belief pace: stale, publishing map/pose at {lag} ms`. A live probe of the real `qualia-pose` binary
with a belief tick 300 ms old and `QUALIA_BELIEF_PACE_MS=200` held the first pose for **1.3 s**, then
logged `qualia-pose: belief pace: stale, publishing pose at 1604 ms` (a second run read 1605 ms). That
is the design in one line: navigation slows, it does not deadlock. Nothing in the step writes to the
ROS graph; leash remains the mapping/localization provider boundary.

The other half of Step 24b is the clock. `BeliefClock::decision_latency_ns()` reads the newest
`BeliefSlot` timestamp across the eight layers, subtracts the newest finished ledger row, and returns
zero when either side is absent or when a ledger row reads newer than the belief — zero rather than a
wrapped subtraction. It sits on an arena view, not on `BraidState`, because the braid's state is
serialised to JSON at `GET /braid` and holds no mapping. T27's TUI renders it as
`belief lag: {ms} ms`.

## The exploration mission, and one field that could not be computed

`runners/explore` now opens `MissionOpened { mission_id: "explore-frontier" }` at stack start and puts
the fly prior into the planner request's existing `belief_risk` block. `uncertainty_weight` is the
prior's total applied weight **divided by the number of coupled types** — the mean applied weight per
type. The raw total was tried first and rejected by review: `couple` sums peak-normalised strengths,
the peak type is always among them, so the sum is always ≥ 1 and the clamp to `0.0..=1.0` made the
field a de-facto boolean. The mean is inside the range by construction and reads `0.625` on the board.
`semantic_novelty` could not be computed at all: the artifact aggregates `dimorphism` away and the
tree has no cell-to-type map, so it is a documented `0.0`, and the ticket records the two shapes (a
`male_specific` mask section in the artifact, or a typed sidecar) that would make it real.

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| `POST /braid` reply | 200, `open_missions` 0 → 1 | — | Board3 comment, PR #196 ^1 |
| `qualia-agent` on Pinkie | 41 passed / 0 failed | tests | same ^1 |
| `qualia-arena-recorder` on Pinkie | 14 passed / 0 failed | tests | same ^1 |
| `qualia-jepa-runtime` on Pinkie | 9 passed / 0 failed | tests | same ^1 |
| Stale belief regions before clearing | 33 × 64 MiB (~1.8 GB) | regions | same ^1 |
| Belief pace default | 250 | ms | `QUALIA_BELIEF_PACE_MS`, T21 |
| Stale window | 8 × the pace | — | T21 comment |
| Held first pose in the probe | 1.3 | s | T21/T24b comments ^2 |
| Stale log lag | 1604 (and 1605) | ms | same ^2 |
| Map tests | 14 unit + 4 e2e | tests | T21 comment |
| Pose tests | 25 unit + 3 e2e | tests | ResumeT21 comment |
| `uncertainty_weight` on Pinkie | 0.625 | — | Board1 comment, PR #184 ^1 |
| `explore` tests on Pinkie (after fix) | 18 passed / 0 failed | tests | Board2 comment, PR #184 ^1 |
| Braid tests on Pinkie (T24b) | 6 + 4 + 1 passed | tests | T24b comment ^1 |

^1 Board runs on Pinkie, native aarch64, from a `git archive` of the head; taken in a different
session from the host work in the same ticket.
^2 The 1.3 s hold and the 1604/1605 ms stale line are from two bounded live probes of the real
`qualia-pose` binary, in sessions different from the board runs; the pose runner's own timing, not a
board measurement.

The commit range this entry describes is [`bf4c506..f39c114`](https://github.com/superposition/qualia/compare/bf4c506...f39c114) — the braid state machine through the
merge that landed the exploration mission. Epics:
[EPIC-07 (#7)](https://github.com/superposition/qualia/issues/7),
[EPIC-08 (#8)](https://github.com/superposition/qualia/issues/8),
[EPIC-08B (#9)](https://github.com/superposition/qualia/issues/9).

## What this does not establish

- **The self-improvement loop has not landed.** EPIC-08B is `status:ready` in all three parts: the
  bounded `QUALIA_FLY_COUPLING_SCALE` dial (`#46`), closing the training/promotion loop through the
  braid (`#47`) and its failure paths (`#48`). No coupling scale has been clamps-tested, no training
  job has been submitted by an agent, and nothing has been promoted.
- **T20's PR is open, not merged.** The `POST /braid` write edge and the strand reports are on
  PR #196; the board exercised the head. T22 (`#37`, rollback and quarantine routing) is still ready.
- **The sync-types `fly_governed` field defaults false and has never been true at runtime.** It landed
  with the C04 rewrite (`3b4fa66`), and the test asserts the default and a round trip, not a mission
  that set it.
- **The pace probe was one binary in one window.** `map` and `pose` have unit and end-to-end tests, and
  the launch-time stale behaviour was observed once at 1.3 s; no multi-minute soak was run.
- **`open_missions` is a counter, not a mission.** Nothing on the board drove an actual exploration to
  completion; the round trip proves the edge, not the behaviour.
- **The board was shared.** Other agents were building and running on Pinkie during these legs; the
  reported results are agreements across runs, not undisturbed measurements.
- **No figure ships with this entry.** No directory under `docs/figures/` matches the slug
  `the-agent-in-the-loop`: the committed sets are the T42 heroes (`the-connectome-as-a-prior`,
  `the-ladder`, `the-front-end-rebuilt-from-lessons`), the T43 turntables (`the-mark`,
  `the-licence-and-the-snapshot`, `the-operating-model`) and T51's `fly-brain` set. None of them draws
  the strand→observe→storage flow or the pace gate's wait/stale decision, so the entry ships without a
  figure rather than with an invented one.
