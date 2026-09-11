---
title: "The front end, rebuilt from lessons"
description: Five existing front ends read as evidence, the lessons written down before the crate existed, then one egui binary with five views, four snapshot tests and a screen that was actually read back — plus a TUI panel and a headless board that can build the GUI but not display it.
date: 2026-09-11 21:15:00 -0400
updated: 2026-09-11
tags: [frontend, egui, tui, testing]
math: false
sources:
  - https://github.com/superposition/qualia/issues/10
  - https://github.com/superposition/qualia/issues/41
  - https://github.com/superposition/qualia/issues/42
  - https://github.com/superposition/qualia/issues/43
  - https://raw.githubusercontent.com/superposition/qualia/main/docs/frontend-lessons.md
---

**The claim.** The console was built against a document, not against taste. `docs/frontend-lessons.md`
reads **five** front ends — the ratatui engine TUI, an egui ops dashboard, a native understanding
viewer, an Ink terminal app and a Vite/React SPA — every cited path resolving (**42 of 42**), and ends
in a table mapping each `apps/qualia-console` decision to the source that produced it. The crate then
shipped as one egui/eframe binary with **five** views, **four** snapshot tests written for the empty
and error cases first, and **16** tests total, with no `192.168.` literal in `src/`. It was smoke-run
for real: against a live shared region and a stub `GET /braid`, all five views were read back through
the window's accessibility tree — belief layers `live` at 443 ms, pose `x 1.250 m, z -0.500 m,
yaw 0.300 rad, confidence 0.88`, map `512 x 512 cells at 0.050 m/cell`. The TUI gained a Mission panel
and the line `braid gen {n} · belief lag: {ms} ms`, and `grep -rn QUALIA_OPS_URL` returns nothing. As a
GUI it is host-only by definition: the board is headless, so its aarch64 artifact is the board
evidence.

## What we tried

**The lessons document ran before the crate, deliberately.** Step 25 exists so that
`apps/qualia-console` is built *against evidence*. Its five sections use a fixed form — what it does →
keep → avoid → evidence (path) — and the closing table is the contract. Two of the five sources are
in a private repository read-only clone; nothing was copied, and the document records lessons and
paths only. `docs/inspiration.md` indexes every private path that was read. `runners/ops` is written
up as a lesson and not as a component, because Step 27 deletes it and this repository never carried
it.

**The stacked top headers were built, then thrown away.** The first console had a top bar, a tab row
and per-view headers; the operator's direction replaced them with five floating, movable, resizable
`egui::Window`s staggered on a diagonal, one slim strip, and a menu to re-open a closed window. The
recovered work was finished as one commit and the blockers as another, so the change of direction is
visible in history rather than hidden in a squash.

**A manifest edit was reverted after review.** The console briefly declared `qualia-lidar`,
`qualia-camera` and `qualia-vslam` into `config/stack-manifest.default.json`; the contract re-read
ruled it out of scope, the file went back byte-identical to the merge base, and the Telemetry view
instead derives its rows from the ABI slots — a named stack contributes its sensing runners in its
own order, and no stack renders the honest empty table. Two tests pin that route.

**Small correctness fixes kept, one dead field deleted.** The Refresh button was inert; the telemetry
view dropped a row on a torn read and rendered a never-published camera as zeros; the poll loop
re-inventoried every `*.mcap` four times a second; the dead `SegmentReading::sha256` field and the
fixture-shaped `Sample::healthy` builder were removed from the library (the builder moved to
`tests/support/`). A README toolchain note claiming a `Cargo.lock` pin the lock did not carry was
deleted rather than corrected.

**The board leg blocked rather than faked.** The dev host has no Docker engine, no `cross`, and no
aarch64 C toolchain: `cargo check --target aarch64-unknown-linux-gnu -p qualia-console` walks 91
dependency crates and dies in `ring`'s build script for want of `aarch64-linux-gnu-gcc`. That was
recorded as **blocked**, not as a build. The console was then built natively on Pinkie instead
(D-010/D-018).

## Five views, one enum, and a fixture that needs no stack

The view set is fixed — mission, belief, world, evidence, telemetry — one module each under
`src/views/`, and the agent's base URL comes from `QUALIA_AGENT_URL` (default
`http://127.0.0.1:8080`) with no host literal in the source. The snapshots are
`mission_healthy`, `mission_degraded`, `belief_stale`, `evidence_empty`, all driven from one committed
`braid-state.json` fixture so no live stack is needed; the empty and error cases were written first
because those are the ones that regress.

The TUI half is the same data on a terminal: `runners/watch` gained a Mission panel reading
`GET /braid` and the chrome line `braid gen {n} · belief lag: {ms} ms`, with the milliseconds from
`BeliefClock::decision_latency_ns()`. The existing panels and child supervision are unchanged, and the
ops dashboard's carriers are gone: `grep -rn QUALIA_OPS_URL` returns nothing, and `runners/ops` was
never in `git ls-tree origin/main runners/` to delete. `qualia-watch` reached **38 passed / 0 failed**
on the board, up from 36, the two extra tests being the agent-URL scheme fix.

## The board can build it, not display it

| Artifact | Size | SHA-256 (first 8) |
| --- | ---: | --- |
| `qualia-console` aarch64 (Pinkie) | 317,755,264 B | `f02168cc` |
| `qualia-watch` aarch64 (Pinkie) | 72,617,480 B | `48aceef9` |

Pinkie has `DISPLAY`/`WAYLAND_DISPLAY` unset, `XDG_SESSION_TYPE=tty` and no compositor, so an egui
window cannot open there; the built ELF is the board evidence and the interactive smoke stays the
host record. The watch binary is different: under a PTY with `stty rows 40 cols 130` it enters the
alternate screen and draws the tab row through `8:Mission`; operator input cannot be exercised
headlessly, so the panel rendering is covered by `tests/view.rs` and `tests/braid.rs` instead.

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| Sources read for the lessons doc | 5 | front ends | `docs/frontend-lessons.md` |
| Cited paths that resolve | 42 of 42 | paths | PR #119 comment ^1 |
| Console views | 5 | views | `apps/qualia-console/src/views/` |
| Committed snapshots | 4 | snapshots | `tests/snapshots.rs` |
| Console tests | 16 passed / 0 failed | tests | T26 comment ^2 |
| Console aarch64 artifact | 317,755,264 | bytes | Board2/Board3 comments, PR #152 ^2 |
| Console artifact SHA-256 | `f02168cc…` | — | same ^2 |
| Belief layers read back in the smoke | 443 | ms age | T26 comment ^2 |
| Pose read back | x 1.250, z -0.500, yaw 0.300, conf 0.88 | m, m, rad, — | same ^2 |
| Map read back | 512 × 512 at 0.050 | cells, m/cell | same ^2 |
| `qualia-watch` board tests | 38 passed / 0 failed | tests | Board3 comment, PR #191 ^2 |
| `qualia-watch` aarch64 artifact | 72,617,480 | bytes | same ^2 |

^1 The 42/42 path resolution was checked when the document landed, in the session that wrote it.
^2 The smoke readings and the board builds are from different sessions: the console smoke was taken by
the session that recovered the crashed worktree, and the Pinkie artifacts by the board job. The two
board artifacts were built in different legs, and the console's was reproduced byte-for-byte by a
second leg.

The commit range this entry describes is [`665c1ab..2306c4c`](https://github.com/superposition/qualia/compare/665c1ab...2306c4c): the lessons commit through the board leg
of the TUI change. Its epic is [EPIC-09 (#10)](https://github.com/superposition/qualia/issues/10);
tickets [T25 #41](https://github.com/superposition/qualia/issues/41),
[T26 #42](https://github.com/superposition/qualia/issues/42),
[T27 #43](https://github.com/superposition/qualia/issues/43).

<!-- ASK: which committed figure pair (one chart, one diagram or render) ships with this entry? No docs/figures/ directory exists for the slug the-front-end-rebuilt-from-lessons; T38/T42/T43 own figures, and Step 42 names the five console panels as extruded tiles for this entry's hero render. The figure should also carry docs/frontend-lessons.md to readers, which the text above only cites. -->

## What this does not establish

- **The smoke is one session's reading.** The pose, map, ledger and telemetry values above are quoted
  from a smoke run against a real shared region and a stub `GET /braid` — not a live agent, not Leash.
  The accessibility-tree read-back is the method; there is no automated end-to-end test of the window.
- **The GUI has never run on the board, and cannot.** Headless is a property of the machine, not a
  configuration gap; the aarch64 build is the only board evidence.
- **`docs/frontend-lessons.md` is the entry's substance, not this post.** Five sources distilled into
  a table is a document; whether a reader of *this* entry learns the same lessons depends on following
  the link.
- **The TUI's Mission panel was not exercised by a human on the board.** Rendering is covered by tests
  and a PTY start; selecting the tab and scrolling were not driven.
- **The 42/42 path check is a point-in-time check.** Paths in a private repository can move; nothing
  re-runs the resolution.
