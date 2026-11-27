---
repo: superposition/scenelab
title: SceneLab
slug: scenelab
tagline: Template-driven arrangement control for Ableton Live, from a CLI and an MCP server
language: JavaScript
stars: 0
pushed: 2026-06-20
url: https://github.com/superposition/scenelab
order: 12
---

## What it is

SceneLab is a control layer for Ableton Live that takes its orders as JSON. A request goes in on standard input — an action, a dry-run flag, and a params object — and a normalized response comes back on standard output, with logs kept on standard error. An MCP server exposes seven of those requests as agent tools, and a Max for Live device is the only component touching Ableton itself. Arrangements are described by template files, and a planner turns a template into scenes, tracks, clips, MIDI notes, and automation intent without touching the Live set.

The problem is that an AI agent editing a real DAW session has no stable contract to work against. Every client would otherwise reimplement clip creation, and none of them would be safe. SceneLab puts a single CLI in the middle: it owns the schemas, the dry-run default, and the confirmation gate, so an MCP client, a shell script, and a test all drive the same code. Writes are opt-in twice over — a request must carry `"dryRun": false` and `"confirm": "apply"` before anything mutates, and the request set contains no destructive operations.

## How it works

The repository is an npm workspace with three packages. `packages/cli/src/index.ts` is the entry point: it reads stdin, parses JSON, validates through `schema.ts`, and dispatches to `actions.ts`. `scan_library` and `plan_arrangement` are implemented in the CLI itself; every other action is forwarded to the bridge when `SCENELAB_BRIDGE_URL` is set and otherwise returns a `not_implemented` response rather than pretending to work.

`planner.ts` holds the arrangement model and one stretch of hand-written city pop harmony: per section, arrays of chords, a bass line, and a lead line as MIDI note numbers. `plan_arrangement` expands those into an `ArrangementPlan` of scenes, tracks with roles and required flags, one clip per scene-track pair with named MIDI notes, and automation entries with a target and a gesture. `templates.ts` validates the JSON templates in `templates/arrangements/` with zod — meter, tempo range, sections, tracks, assets — and raises `TemplateRegistryError` on a bad registry. `library.ts` walks an Ableton User Library and classifies `.adg`, `.alc`, `.adv`, `.wav`, `.amxd`, and `.als` files into a typed inventory.

`packages/mcp/src/tools.ts` declares the agent-facing tools — `ableton_status`, `scan_library`, `plan_arrangement`, `apply_arrangement`, `create_clip`, `load_rack`, `write_automation` — each forwarding to the CLI, with no Ableton logic of its own. On the other side, `max/node/src/server.cjs` runs a localhost HTTP server on port 31741 with `/requests`, and `live-adapter.cjs` talks to the Max runtime through `max-api`. The manual acceptance test in `docs/acceptance/manual-ableton-v1.md` walks the chain against Ableton Live 11 Suite and only counts a live-mutation proof when confirmed writes appear in the set.

## Run it

```sh
npm install
npm run build
```

The dry-run plan exercises the interesting path without Ableton:

```sh
printf '{"id":"manual-plan","action":"plan_arrangement","dryRun":true,"params":{"templateId":"city-pop-6-8"}}' \
  | node packages/cli/dist/index.js
```

It answers with a 6/8 plan in A major at 96 BPM: six scenes, seven tracks, forty-two clips, and automation intent for `synth-lead.cutoff` and `return.delay.send`. Test suites run from the root:

```sh
npm test
```

Against a real set, the acceptance document sets `SCENELAB_BRIDGE_URL` to `http://127.0.0.1:31741` and drives `status`, `create_scene`, `create_midi_track`, `create_midi_clip`, `set_clip_name`, `set_clip_notes`, and `inspect_set`. TypeScript 5.8, `@modelcontextprotocol/sdk` 1.29.0, and zod 3.25 are the pinned toolchain.

## Caveats

It is scaffold-stage code, and says so: only the library scan and the planner are real without a bridge, and `apply_plan` is documented as not yet accepted as a live-mutation proof. The Max for Live device is not in the repository — the acceptance test assumes `SceneLab Bridge.amxd` is available locally — so the Ableton side can be read but not run from a clone: the bridge's Node half ships here, while the Max patch that answers its requests does not, and the entry point falls back to an adapter that reports the Live set unreachable outside Node for Max. The acceptance checklist's "Intro"/"Bridge" labels do not match what the template emits ("Intro Hook", "Bridge Modulation"). Nothing records an executed Live session: the acceptance template's date, commit, Ableton version, and pass/fail fields are blank. The Serum rack standard is documentation only, with no rack files or device shipped, and nothing measures planning accuracy or what a confirmed write does to a real set's timing.
