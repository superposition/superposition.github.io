---
title: "The connectome as a prior"
description: Turning a 929,735-edge type-level connectome into a checked, attributed artifact a belief layer can load — built offline, from two Feather files, with a 12-row fixture standing in for the dataset.
date: 2026-09-11 21:05:00 -0400
updated: 2026-09-11
tags: [connectome, csr, offline-build, provenance]
math: true
sources:
  - https://github.com/superposition/qualia/issues/2
  - https://github.com/superposition/qualia/issues/3
  - https://github.com/superposition/qualia/pull/124
  - https://raw.githubusercontent.com/superposition/qualia/main/crates/connectome-prior/tests/fixtures/mini-type-edges.csv
  - https://superposition.github.io/journal/the-male-cns-as-arrays/
---

**The claim.** A connectome becomes usable as a prior at exactly one moment: when it is written down
as a file whose numbers a consumer can verify. This step builds the type-level graph **offline**, from
two Feather tables, and emits three files: `graph.bin` (`rowptr` `u64`, then `cols` `u32`, then
`weights` `u32`, little-endian — a compressed sparse row (CSR), in which `rowptr` gives each type's
slice of the concatenated `cols` and `weights`), `manifest.json` (schema `qualia.connectome-prior.v1`,
a type count, an edge count,
four SHA-256 digests and the attribution) and `attribution.json`
(`male-cns:v1.0`, `CC-BY-4.0`, the dataset URL, `Berg et al. 2026, Cell`). It was exercised on a
hand-written fixture of **12 edges over 5 types**, which collapse to **9** distinct type pairs and to
a CSR of `rowptr = [0,2,4,5,7,9]`, `cols = [1,2,2,4,0,0,2,2,3]`,
`weights = [3,2,8,25,13,6,11,12,12]`, with **7 tests** passing. The same builder, pointed at the real
release, is the one that would produce the **929,735-edge** type graph over **11,687 types** the
earlier entry measured from the dataset. Nothing here downloaded the dataset; the fixture is the
whole measured claim.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-connectome-as-a-prior/hero.webp"
         width="1100" height="619"
         alt="The extruded psi monogram beside a five-by-five lattice of raised blocks: one block for each of the nine nonzero (pre_type, post_type) pairs of the committed fixture, its height the pair's summed weight.">
  </picture>
  <figcaption>
    <p>The extruded mark beside the fixture's type-level CSR: nine raised blocks on the 5×5 type
    lattice, one per nonzero <code>(pre_type, post_type)</code> pair, each block's height the pair's
    summed weight. The other sixteen cells are the absent pairs.</p>
  </figcaption>
</figure>

## What we tried

**A single crate, four narrow steps.** `build_type_graph` reads Arrow IPC (file and stream framing),
maps both endpoints through the annotation table, sums weights per `(pre_type, post_type)`, sorts by
that pair and emits CSR. `write_prior` writes the three files. `main.rs` is a clap binary with three
arguments. The last step added the error paths. They landed as four commits — `b56789e`, `a61fdb9`,
`6799365`, `8adb09c` on `ticket/T06` — because one owner held the directory and the tests could grow
one assertion at a time.

**The plan's Arrow 53 was abandoned.** `arrow = "53"` cannot compile in this workspace: `arrow-arith`
53.4.0 declares an internal `ChronoDateExt::quarter()` that collides with `chrono::Datelike::quarter`,
added in chrono 0.4.44. Arrow 56 is already the workspace's arrow (through `rerun`), removed the
redundant methods, and carries the same IPC reader. The dependency is `arrow = { version = "56",
features = ["ipc"] }`, and the lock churn is exactly the arrow 53 stack leaving (14 packages) plus
`arrow-csv 56.2.1`. The ticket text was left as written; this is the resolution.

**The binary was rebuilt three times for line endings.** `860235a` → `b56789e`, `d4eff4c` →
`a61fdb9`, `d670f93` → `6799365`: a staging script had introduced CRLF into the new files, and the
provenance gate treats line-ending differences as real (see the licence entry). Content unchanged
each time; the LF rewrite was cheaper than teaching the gate an exception.

**`edge_count` had two defensible readings and we fixed one.** The manifest says `edge_count`, and
`write_prior` receives only the graph, so the only value recoverable from its inputs is the CSR
nonzero count — the 12 fixture rows collapse to 9 pairs and the manifest records `9`. The alternative
(segment-level rows) is not available to the function, so the ambiguity was resolved by the interface,
and stated on the ticket rather than left to a reader.

## The fixture is the oracle

The test does not assert against a table copied from the implementation. It synthesises Feather inputs
from the committed CSVs with arrow's own IPC writer, then aggregates an oracle **in the test** from
the CSV rows, and compares the emitted CSR to that. The invariant the fixture holds is the one the
builder needs: every `type` in the edge file appears in the annotations file, and exactly one type
(`DNp01`) is `male-specific`. The five types are `DNp01`, `EPG`, `KCg-m`, `OA-VPM3`, `PEN_a`; the 12
rows become 9 pairs.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-connectome-as-a-prior/csr-matrix.svg"
         width="740" height="620"
         alt="The committed fixture's twelve segment rows summed into the nine nonzero (pre_type, post_type) pairs as a weighted five-by-five matrix; the sixteen empty cells are the absent pairs.">
  </picture>
  <figcaption>
    <p>The fixture's CSR as a weight matrix: the twelve segment rows summed into the nine nonzero
    <code>(pre_type, post_type)</code> pairs, the sixteen empty cells the absent pairs. Drawn by the
    committed <code>make_figures.py</code> from the fixture CSV, not pasted.</p>
  </figcaption>
</figure>

Two error paths are pinned beside it. A missing file or a missing column is `PriorError::Read`. A row
whose body id is in no annotation is **skipped and counted**, not fatal: the test injects one such row
so the fixture holds 13 rows, and `build_type_graph_reporting` returns
`UnmappedRows { skipped: 1, total: 13 }` as a warning while the emitted CSR is unchanged. For a
dataset whose annotation table and edge table are separate downloads, the difference between "some
rows did not join" and "the build failed" is the difference between a usable warning and an outage.

## Written once, refused on reread

The artifact is designed to be read by a crate that does not trust it. `manifest.json` carries four
digests — `source_sha256` over the whole `graph.bin`, and one per section — and the consumer
(`crates/jepa`) verifies them, and the size the counts imply, before decoding any array. The producer
also refuses to overwrite itself: if `dir` already holds a `manifest.json` whose `source_sha256`
matches, `write_prior` returns `AlreadyBuilt` **before** any write or `create_dir_all`. The test
compares name, mtime, length and bytes of all three files across the second call; the binary reports
the same thing on stderr and exits non-zero (`prior: prior already built from the same graph`, exit
1), while a first run prints one line to stdout: `prior: 5 types, 9 edges -> <dir>`.

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| Fixture segment edges | 12 | rows | `crates/connectome-prior/tests/fixtures/mini-type-edges.csv` |
| Fixture types | 5 | types | same file |
| Distinct type pairs after aggregation | 9 | pairs | `ticket/T06` comment, T06/T09 |
| Builder tests | 7 | tests | `cargo test -p qualia-connectome-prior` |
| `UnmappedRows` in the injected case | 1 of 13 | rows | `skips_unmapped_rows_and_warns` |
| Arrow version used | 56 | — | `crates/connectome-prior/Cargo.toml` |
| Packages dropped with arrow 53 | 14 | packages | `ticket/T06` comment |
| Target-scale type edges (dataset) | 929,735 | edges | the earlier `the-male-cns-as-arrays` entry ^1 |
| Target-scale types (dataset) | 11,687 | types | same ^1 |

^1 The 929,735 / 11,687 pair is the dataset release figure quoted in the earlier journal entry
`the-male-cns-as-arrays`, which was written in a different session from this one. It is the scale this
builder targets; it is **not** a measurement made by this ticket, whose only measured graph is the
9-pair fixture. The dataset numbers and the fixture numbers are different quantities and are not
comparable.

The commit range this entry describes is [`d6f19d7..2e288a4`](https://github.com/superposition/qualia/compare/d6f19d7...2e288a4): the workspace registration and fixture
commit, through the merge of the four builder commits. Epics:
[EPIC-02 (#2)](https://github.com/superposition/qualia/issues/2) for the fixture and the members,
[EPIC-03 (#3)](https://github.com/superposition/qualia/issues/3) for the crate.

## What this does not establish

- **The dataset path is untested.** Every measured number is from the 12-row fixture. The real build
  reads two multi-gigabyte Feather exports; whether it completes, how much it skips and how long it
  takes are unmeasured. The dataset's own type graph is a release figure, not an output of this code.
- **No sign, no dimorphism, no dynamics.** The edge table carries no excitatory/inhibitory column, and
  the artifact is `rowptr`/`cols`/`weights` only. `dimorphism` is read from the annotations and then
  aggregated away. The type names and the male-specific flag are in the input and not in the output.
- **`skipped` has never been non-trivial.** The unmapped-row path was exercised with one injected row
  out of 13. What the ratio is on the real download — where identity is per segment and the annotation
  table has its own coverage gaps — is unknown.
- **The digests prove integrity, not provenance.** `source_sha256` pinned in the manifest proves the
  `graph.bin` next to it is the one that was written; it says nothing about which upstream export was
  read. Attribution is a separate JSON file and is not signed.
- **The idempotence rule is exact-match only.** A rebuilt artifact from updated inputs has a different
  `source_sha256` and will overwrite the directory without asking. "Already built" means "built from
  these exact bytes", not "do not rebuild".
