---
title: "The licence and the snapshot"
description: In a clean-room rewrite the licence and the proof of non-copying are the deliverable, not paperwork around it. Apache-2.0, a NOTICE carrying three attributions, and a gate that compared 104 then 110 files against the private reference and found 0 identical.
date: 2026-09-11 16:30:00 -0400
updated: 2026-09-11
tags: [clean-room, licence, provenance, engineering]
math: false
sources:
  - https://github.com/superposition/qualia/issues/1
  - https://github.com/superposition/qualia/issues/66
  - https://raw.githubusercontent.com/superposition/qualia/main/LICENSE
  - https://raw.githubusercontent.com/superposition/qualia/main/NOTICE
  - https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-licence-and-the-snapshot/provenance.json
---

**The claim.** The public repository opens at commit `776bff0` with a five-file first commit —
`LICENSE`, `NOTICE`, `Cargo.toml`, `.gitignore` and one workflow — carrying **Apache-2.0** and no
prior history: `license = "Apache-2.0"` in the workspace package, `Copyright 2026 Superposition LLC`
in the licence text, and a NOTICE with exactly **three** attribution blocks (this product, the Leash
project under MIT, and the Male CNS dataset under CC-BY 4.0). What makes that more than a header is
the gate added at `144bb6d`: `scripts/provenance_check.py` compares every tracked file whose relative
path also exists in the private reference checkout, **byte for byte**, and reports the count. At
`144bb6d` it printed **157 tracked files, 104 compared, 0 identical**; at `a59b836`, the head when
the figures were drawn, **170 tracked files, 110 compared, 0 identical**. Both runs exited 0. Zero
copied files is a number you can check, and it is the whole claim.

## What we tried

The first shape was a snapshot with the history thrown away: `git archive HEAD | tar -x`, `git init`,
one commit. That is the shape that survived — the first commit is those five files, and every later
commit is written here.

**Relicensing was conditional, and the condition was checked.** The ticket's failure mode reads: if
any commit author in `git log --format='%ae' | sort -u` is not under the user's control, keep those
files at MIT and note them in the NOTICE rather than relicense a third party's work. The authors were
under control, so the workspace field became `license = "Apache-2.0"` and the per-crate manifests
point at it.

**The guard moved twice, and ended as a script.** A `notice-check` workflow job tested
`test -s NOTICE && grep -q "Leash project" NOTICE && grep -q "CC-BY" NOTICE && test -s LICENSE`.
When the workflows were dropped the same check became `.github/scripts/notice-check.sh`, so the guard
survives without CI. This is the first entry, so it is also where the pattern of handing a check to a
script instead of a runner starts.

**The provenance gate kept being wrong, in four distinguishable ways.** The verifier's first version
treated any byte-identical file as fatal, which flagged prose and rendered output that could not
plausibly have been copied: `provenance: a raw byte match is fatal unless the bytes are our own text`
(`7751c45`), then `judge the reference on what it records, not what it renders` (`b2b4a70`), then
`identity is fatal only for text this worktree authored` (`92e6871`). None of those were kept as
written. What was kept is **text compared modulo line endings** — `compare text modulo line endings
so the verdict ignores checkout settings` (`d99fe9a`) — because a Windows checkout writes CRLF and the
same file then reads as identical on one host and not on another. The final rule is in `b7ac824`
(`#160`): the identity verdict must not depend on checkout settings. The gate is also rooted at
`git rev-parse --show-toplevel` rather than at the script's own directory (`902f286`), so running the
copy in a worktree measures that worktree and not `main`.

**Secrets were a rule, not a review.** `.gitignore` carries `**/*.env`, `!**/*.env.example` and
`deploy/**/camera-stream.env`, so the one secret-shaped path in the private tree cannot be committed
by accident. `git check-ignore -v deploy/leash/camera-stream.env` prints the match.

## Two sources, one file

The NOTICE is where two other licences land, and neither of them is Apache-2.0:

- software from the Leash project (`https://github.com/specdog/leash`) under **MIT**;
- the Male CNS connectome (`Berg et al. 2026`, `https://male-cns.janelia.org`) under **CC-BY 4.0**.

So the repository's licence is not one licence. Apache-2.0 covers the rewrite; MIT covers a dependency
whose work is *included*; CC-BY covers data *derived* from a published dataset. The NOTICE is the join.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-licence-and-the-snapshot/licence-flow.svg"
         width="1100" height="420"
         alt="A dashed boundary labelled clean room separates the private reference (read for interfaces only) from this repository. Below the line, three attribution sources — the relicensed workspace root, Leash under MIT, the Male CNS dataset under CC-BY 4.0 — fan into a NOTICE box, which is guarded by the notice-check script.">
  </picture>
  <figcaption>
    <p>The clean-room boundary and the three attributions that cross into the repository. The dashed
    line is the decision: interfaces may be read, bytes may not be copied. The NOTICE is the only
    place the other two licences appear, and the guard keeps all three strings present.</p>
  </figcaption>
</figure>

## The number the gate prints

The gate's method is narrow on purpose: it compares only files whose **relative path also exists** in
the reference checkout, because everything else cannot have been copied. That is why the compared
count is smaller than the tracked count — 104 of 157, then 110 of 170.

<figure class="measurement">
  <picture>
    <img src="https://raw.githubusercontent.com/superposition/qualia/main/docs/figures/the-licence-and-the-snapshot/provenance-check.svg"
         width="1100" height="460"
         alt="For each of two commits, three bars: files tracked in this repository, files whose relative path also exists in the private reference checkout, and files byte-identical to it. At 144bb6d: 157, 104, 0. At a59b836: 170, 110, 0.">
  </picture>
  <figcaption>
    <p>Tracked, compared, identical — at the commit that introduced the check and at the head when it
    was last run. The third bar is zero at both. Drawn by the committed
    <code>make_figures.py</code> from <code>provenance.json</code>, not pasted.</p>
  </figcaption>
</figure>

## Evidence

| Quantity | Value | Unit | Source |
| --- | ---: | --- | --- |
| First commit's files | 5 | files | `git show --stat 776bff0` |
| Attribution blocks in `NOTICE` | 3 | blocks | `NOTICE` ^1 |
| Workspace licence | `Apache-2.0` | — | `Cargo.toml` `[workspace.package]` ^1 |
| Tracked files at `144bb6d` | 157 | files | `provenance.json` ^2 |
| Files compared at `144bb6d` | 104 | files | same ^2 |
| Byte-identical at `144bb6d` | 0 | files | same ^2 |
| Tracked files at `a59b836` | 170 | files | same ^2 |
| Files compared at `a59b836` | 110 | files | same ^2 |
| Byte-identical at `a59b836` | 0 | files | same ^2 |

^1 Read from the committed file at `main`, not from this text.
^2 `docs/figures/the-licence-and-the-snapshot/provenance.json`. The two runs were taken in
a later session than the commits they measure; the commits are `144bb6d` (which introduced the check)
and `a59b836` (the head then).

The commit range this entry describes is [`776bff0..144bb6d`](https://github.com/superposition/qualia/compare/776bff0...144bb6d) — the snapshot and licence files through
the commit that added the provenance gate. `776bff0` is the first commit on `main`; there is no
history before it. A later run recorded in `provenance.json` is taken at `a59b836`.
The rewrite itself is [EPIC-00 (#66)](https://github.com/superposition/qualia/issues/66); this entry's
epic is [EPIC-01 (#1)](https://github.com/superposition/qualia/issues/1).

## What this does not establish

- **Zero identical is measured against one checkout.** The gate compares against the private
  reference tree present on the machine it runs on. A different revision of the reference, or none at
  all, gives a different number; the verdict is only as good as that checkout. The reference's path is
  deliberately not recorded in the committed data.
- **The comparison is byte equality, not similarity.** A file that is 90 % copied is not identical and
  the gate passes it. Reformatting defeats the check; the check is a floor, not a proof of
  authorship.
- **Two runs are recorded, not a continuous measurement.** `144bb6d` and `a59b836` are the two runs in
  `provenance.json`. Nothing re-runs the gate on every commit.
- **Not a legal opinion.** That the NOTICE's MIT and CC-BY attributions are the ones that are owed
  was decided by the plan's step text, not by counsel; no third party audited the result.
- **The 104/157 split is a path coincidence, not an audit.** A file is compared only when a
  same-relative-path file exists in the reference; files that differ in name are never compared, so
  "0 identical" does not mean "0 files read".
