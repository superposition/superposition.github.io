# The map: the home hero's scene

The hero's backplate is a picture of this site. Five topics, twenty repository
pages, four series units and the journal, laid out in space around the station
at the origin, with an edge wherever the repository records a relation. It is
drawn twice from one layout: as an SVG that ships in the page, and as a WebGL
scene that takes over when the reader's browser can draw it and has not asked
for less motion.

This file is the spec. The measurements the frame is held to are printed by the
generator, which fails rather than writes output when one of them is missed.

## The renderer

three.js `0.187.0`, vendored at `assets/vendor/three/` (MIT, licence beside it,
sha256 in the README there), addressed by an import map that only a page with
`scene:` in its front matter emits. The fat-line addon
(`examples/jsm/lines`, 5.5 KB gzipped) is a second vendored file, and only the
map loads it.

Cost, gzipped: three.js 189,579 bytes, the line addon 5,521, the map's own code
(entry plus four shared modules) 16,875 — it grew from 9,470 when the plate
gained the occlusion cut, the light and the ramp.

## What the map is made of

| On the page | Node | Form | Where it comes from |
|---|---|---|---|
| A topic | `topic:<slug>` | a graduated ring, sixteen sides | `_data/topics.yml` |
| A repository page | `repo:<slug>` | a diamond, four sides | `_repos/*.md` |
| A series unit | `unit:<slug>` | a triangle, three sides | `_data/cast.yml` |
| The journal | `journal` | a bracket, open to the right | `site.posts` |
| An entry, when one is published | `entry:<slug>` | a tick | `_posts/*.md` |
| The station | `station` | a ring, a crosshair and a mast | fixed: the origin |

| Edge | Means | Read from |
|---|---|---|
| station → topic | the map is anchored here | the layout |
| topic → repository | filed under that topic | `_data/topic-by-repo.yml`, or the repository's own `topic:` front matter |
| repository → unit | that unit fronts this library | `_data/cast.yml`'s `library.slug` |
| station → journal | the arm with nothing on it yet | the layout |
| journal → entry | that entry belongs to the journal | `_posts/*.md` |

Kind is carried by the form and by the label, never by colour alone: a ring, a
diamond, a triangle and a bracket are four different shapes with four different
counts of sides, and the caption above the plate names them.

The one series unit whose library has no page here (`reeldeal`) gets no edge,
because there is nothing on this site for the edge to land on. That is recorded
rather than guessed: the node carries `fronted: false`.

## One layout, two renderers

`scripts/scene/map.mjs` reads the content, lays it out, and writes two files:

- `_data/scene-map.yml` — every node's world position, size, label offset, name
  and link, plus the camera. 1.8 KB gzipped, and emitted into the page as JSON
  so the canvas reads the same numbers.
- `_includes/scene/map.svg` — the same scene projected once, cut, lit and
  depth-ramped, with the names set as text. 26 KB, about 6 KB gzipped.

The geometry the canvas draws comes from `assets/scene/lib/forms.js`, and the
camera and projection from `assets/scene/lib/camera.js` — the same two files the
generator calls. There is no second layout to drift.

Regenerate after adding a repository, a topic, a unit or an entry:

```sh
node --experimental-default-type=module scripts/scene/map.mjs
node --experimental-default-type=module scripts/scene/map.mjs --check
```

`--check` writes nothing: it exits 1 when either committed file is not what
this seed draws, and prints the sha256 of what it would have written. The run is
byte-identical across engines — the arithmetic that decides where anything goes
is 32-bit integer (`seeded.js`), every number is rounded before it is written,
and the files are written with LF line endings.

The generator refuses to write when:

- a node would leave the frame at any pose the camera can reach, at 1440 or at
  420 (checked with the node's own radius, not just its centre);
- a node would fall into the band the hero's type stands in;
- two forms would touch, or two labels would overlap;
- an edge names a node that is not on the map;
- the content and the layout disagree about how many of anything there are;
- a drawn edge still has ink inside a nearer repository's diamond, or a
  nearer form does not interrupt it;
- a label's baseline is off its row, or a label's box leaves the frame;
- a form has no lit face or no shadowed one.

Positions that collide after the seeded jitter are nudged by a fixed local search
(`relax`), and the camera is aimed so the whole map sits in the band the type
leaves for it (`settle`). Both are deterministic: the same content gives the
same file, byte for byte.

`scripts/scene/measure.mjs` is the second opinion. It reads the generated files
— not the generator's report — and counts the hidden-line crossings, the ink
each depth role carries, the pitches in the small detail, the 4 × 4 density of
the frame, the label baselines against the grid, and the lit and shadowed faces
per form. It has its own gate list (`--gates` behaviour: exit 1 on any
violation), so a hand-edited still fails it even when it looks plausible.

## The camera

A pinhole, 26 degrees, on an orbit of radius 9 around a target placed so the
plate's mass sits left of the frame's centre (`AXIS`, −0.07 of the half width:
the judgement — the right of the frame is the deliberate empty, and the
journal's arm crosses it and leaves). The map's own geometry is composed for a
1.82 : 1 box — the home hero's ratio at 1440 by 900 — and the box keeps its
width at every other window shape: a phone shows the whole plate, smaller, and
the black above and below it is the page's own ground.

Both renderers letterbox that box into the frame the same way. The SVG does it
with `preserveAspectRatio="xMidYMid meet"` on its 1820 by 1000 viewBox; the
canvas does it with a viewport and a scissor rect of the same size and offset
(`plate()` in `map.js`), projecting at the fixed `ASPECT` rather than at the
window's own ratio. That is why the still and the canvas land on the same
pixels at every width — measured: at 1440 × 900 the two put every name within
0.6 px of the other, and 98.6% of the hero's pixels are within three grey levels
of each other. Without the letterbox the canvas drew the plate 48 px higher and
about 14% larger than the still, and the change from still to canvas was
visible as a jump.

Four bounded motions, all of them presentation:

| Motion | Bound | Why |
|---|---|---|
| orbit, yaw | ±4.5°, period 37 s | the plate breathes rather than spins |
| orbit, pitch | ±1.5°, period 53 s | two periods, so the loop is 1961 s, not 37 |
| pointer | 0.9° of yaw, 0.55° of pitch, damped at 0.05 per frame | the plate leans towards the hand |
| scroll dolly | radius ×1.00 → ×1.14 as the hero leaves the top | the plate pulls back as you turn away, so it can only ever shrink from the framed state |

The pointer's contribution is inside the orbit's, so the envelope in
`map.mjs` covers the hand as well as the clock. `POSES()` is that envelope:
three yaw values, three pitch values, both dolly limits — eighteen poses, each
checked at both window shapes.

`prefers-reduced-motion: reduce` never starts the renderer: the still is the
composed still, from the same layout and the same camera, with the same depth
ramp. Nothing moves, nothing is downloaded, and the "Hold the map" switch is
hidden because there is nothing to hold.

## The sky

Three shells of points at 9.2–14, 16–24 and 28–44 world units, 90, 150 and 220
of them, placed inside the composed camera's frustum from the seed so they fill
the frame at any window shape and parallax against each other when the camera
dollies. Each point has its own size and alpha, from the same stream the still
uses, so the still and the canvas show the same stars in the same places.

Behind them, eleven additive discs at 0.9–3% alpha, from 9 to 22 world units in
radius, placed in the world rather than in the frame: no texture, no video, no
CSS gradient, and the same eleven in both renderers, drawn with the same
`(1 − d²)²` falloff. It is meant to be invisible at a glance and present at the
second look; the frame's darkest sky is 3.2% of the hero's ink.

## Ink and weight

Strokes are the site's three weights: `--hair` for edges, rungs, repository
diamonds, triangles and the journal; `2 × --hair` for topic rings and the spines
to them; `--rule-thick` for the station. In the SVG they are
`vector-effect: non-scaling-stroke`, so a one-pixel rule is one pixel at every
width. Every colour is a token read from the stylesheet at runtime — no literal
in either renderer, and none in the generated file either (the still writes
`var(--star)` and its three neighbours, never a hex).

One hue per kind, and the accent only where something functional happens: amber
on the station, which is the origin; the state colour on the series units; the
star's own cream on the topics and the spines, the cream on the diamonds, the
dust on the edges and the journal. The spines used to be amber in the canvas and
`--star` in the still — the same line drawn in two inks by two renderers — and
they are `--star` in both now.

## One light

`LIGHT` in `assets/scene/lib/forms.js` is the whole of it: **azimuth 112°,
measured in the frame's own plane from its +x axis counter-clockwise, and it is
the direction the light comes from** — upper left, and off the diamonds' own
axes so no face is a boundary case. Elevation is zero: it is a flat key, not a
sun, which is what a line drawing can carry.

Every segment of every form is either lit or in shadow, decided by that
segment's own outward normal — the normal running from the form's centre
through the segment's midpoint, in the plane the form is drawn in:

    lit      normal · light > 0.05
    shadow   otherwise

The path's opacity is the role's value times `FACE`: 1 for a lit face, 0.52 for
a shadowed one. On a diamond that is two faces up and two down (`dot` 0.39 and
0.92 lit, −0.39 and −0.92 shadow); on a triangle the two upper faces take it and
the base falls away; on a ring it is the half that faces the light. Because the
normal comes from `normalOf()` and the value from `FACE`, the still and the
canvas cannot hold two lights: the canvas bakes the same per-segment answer from
the same two functions.

Measured over the plate: 176 lit and 180 shadowed strokes over 31 forms, mean
opacity 0.563 against 0.292 — 1.93×, which is the stated 0.52 reciprocal to
within a rounding. Before this pass: 31 of 31 forms were drawn at one value and
no stroke anywhere was shadowed.

## The haze: one value per role

`DEPTH` in `assets/scene/lib/camera.js` is the depth model, and it is the only
place a stroke's value comes from. Distance is measured in front of the camera
and normalised against the composed orbit radius, so the numbers do not change
when a page picks another radius:

    u = (distance − radius · 0.62) / (radius · 1.62 − radius · 0.62)

`u` runs 0 at the nearest the plate comes and 1 at the far limit. Four stops sit
on it, and each stroke takes the value of the stop it lands in:

| Stop | `u` | Value |
|---|---|---|
| highlight | ≤ 0.12 | 1.00 |
| near | ≤ 0.20 | 0.88 |
| mid | ≤ 0.38 | 0.60 |
| far | > 0.38 | 0.36 |

Three roles with a step between them — near/mid 1.47, mid/far 1.73, near/far
2.51 — and pure light spent on the nearest sliver only: the highlight band
holds 5.1% of the plate's ink. Nothing else in either renderer dims a stroke.

The haze takes length as well as value. `HAZE.gap` lifts the pen at each end of
an edge by the role of the form it lands on — nothing near, 2.5 px mid, 6 px
far, in the still's own units (1 is half the frame's width) — so a far edge is
shorter as well as fainter. And an edge is cut again wherever it crosses a role
boundary, so it steps down as it recedes instead of being evenly dimmed: the
long spine from the station to a far topic is drawn in three values along its
own length.

Before this pass the plate had 23 distinct opacities, no stroke in the far
third of its depth at all (the ramp never reached the far stop), a near/mid
ratio of 1.10, and its brightest ink at 0.79 rather than pure light.

## Hiding: edges stop at what is in front of them

An edge is a straight line between two records and the plate is a set of opaque
forms. So the line is **cut**, not drawn under the form:

- at both ends, by the silhouette of the form it lands on — an edge terminates
  at a diamond's edge, not at its centre;
- wherever it passes behind a nearer form's silhouette, whatever that form is.

The cut itself is `pieces()` in `lib/camera.js`: each silhouette is a convex
polygon in normalised device coordinates, the segment is clipped against its
half-planes, and the depth test is a single division because the projection is
affine in 1/z. A cut is opened by about a pixel, so the pen lands clear of the
silhouette instead of exactly on it. Both renderers call the same function and
push the same world-space pieces; nothing is faked with a darker stroke, and a
darker stroke would not survive the measurement.

It does survive it. `measure.mjs` samples every edge along its own line and
asks whether *that edge's* ink is inside a nearer diamond — or inside the
diamond at one of its own ends, which is the same failure: an edge that reaches
a centre has crossed the silhouette it should have stopped at. The plate has 27
places where a diamond stands in front of an edge; before this pass ink crossed
all 27 (306 samples, 24 of the 29 edges); after, none. The measure also checks
the other half — that an edge has ink where it is *not* hidden — so a plate that
hid everything would fail too: 94.6% of the pen's own open length on the solid
edges carries ink.

## The names: one grid

`LABEL_GRID` in `forms.js`: rows every **26 units** from `top` 16 in the still's
1820 by 1000 box, cap height 13, a 10-unit gap from the form, and a 9.1-unit
advance per character (13 px mono at 0.6 em advance plus 0.10 em tracking).

Each name is set clear of its form, then its **baseline** is snapped to the
nearest row — moving up a row rather than down when that is what it takes to
keep the gap — and the journal's name slides left until it fits inside the
frame. A name whose box would still land on another's is dropped rather than
piled up, though with the grid in place all eleven fit. The offset that
survives is stored per node in the YAML, so the canvas hangs each name from the
same baseline (`calc(-100% + 0.21em)`, the descender).

Before: 10 of 11 baselines were off any row by 1.5–12 px, and the journal's
name ran 6 px past the right edge of the frame. After: 0 violations, no
overflow.

## The composition

- The plate's mass sits left of centre (`AXIS`): the ink centroid is at −0.069
  in normalised device coordinates, against +0.014 before.
- The journal's arm continues past its bracket, through the frame's right edge
  and out (`CROP`). It is the one line on the plate with no form at its end —
  there is nothing on the other end of a journal that is still empty — and it is
  the deliberate crop: the empty right third is crossed by one dashed line.
- The density 4 × 4 over the plate runs from 2,551 units of ink to 0 in the
  corner cell; the frame as a whole holds 8 empty cells of 16 (the type band and
  the crop).

## Repeated detail

Small marks at a pitch, from `RUNG` and `DASH` in `forms.js`, which both
renderers read:

| Where | Pitch, as detected | Marks |
|---|---|---|
| topic rims, sixteen ticks inside each ring | 16.5 px | 80 |
| unit base rungs | 14 px | 12 (all twelve at the pitch) |
| the station's rim ticks | 64.5 px | 8 |
| the journal arm's dashes | 21.5 px | 41 |
| spine rungs, square to the run | 27.6 px along a spine | 20 |

The pitches above are *detected* by `measure.mjs` as the modal gap between a
mark and the next mark of its class, not declared. The spine rungs are the one
class whose reading needs its caveat: the detector sees a 14 px gap for them,
because all five spines leave the station and a rung on one spine is often
nearer a rung on its neighbour than the next rung on its own; the pitch along a
spine is 27.6 px, and the parallel-mark reading agrees at 14 px for the unit
bases and 15.5 px for the rungs. Before this pass there was no repeated small
detail on the plate at any pitch.

The plate sits at `z-index: -3`, under the hero's existing scrim
(`--hero-scrim`: 52% of the void at the top of the frame, 93% at 80%, opaque at
the foot). That scrim is why the type does not fight the drawing — and it is
also why the map's ink measures 70–100 of 255 rather than 230.

The generated SVG publishes its own `title` and `desc`, and the include carries
a visually-hidden sentence with the counts and the key, so the drawing has a
text description whether or not the canvas runs.

## The fallbacks

| Reader | What they get |
|---|---|
| No JavaScript | the still, whole |
| JavaScript, no WebGL2 | the still, whole — the module returns before touching the DOM |
| JavaScript, WebGL2, `prefers-reduced-motion: reduce` | the still, whole — the composed still with the composed depth ramp |
| JavaScript, WebGL2, three.js fails to load | the still, whole — the canvas is only revealed after a frame has drawn |
| Script blocked after load | the still, whole |
| Everything works | the canvas, at 5 draw calls, over the same composition |

Nothing on the page depends on the canvas. Every node is a link that already
exists below the frame, in the repository list, the topic list, `/series/` and
`/journal/`; the canvas is `aria-hidden`, and hovering a form names it and
clicking it goes there.

## The numbers

Measured in headless Chrome on chalant (Windows, Chromium 1255, WebGL2 through
SwiftShader), from `_site` built by WSL Ruby 3.0.2, and by
`scripts/scene/measure.mjs` reading the generated files:

| | 1440 × 900 | 420 × 900 |
|---|---|---|
| nodes / edges | 31 / 29 | 31 / 29 |
| strokes drawn | 438 | 438 |
| — of which edge pieces | 83 | 83 |
| — of which rungs | 20 | 20 |
| — of which form segments | 335 | 335 |
| draw calls | 5 | 5 |
| triangles | 2,650 | 2,650 |
| points | 460 | 460 |
| canvas segments vs still strokes | 438 = 438 | 438 = 438 |
| canvas name position vs the still's, worst | 0.6 px | labels are hidden below 700 px |
| still render vs canvas render, pixels within 3 grey levels | 98.6% | — |
| the map's own code (entry + four modules), bytes / gzipped | 45,711 / 16,875 | same |
| the still, bytes / gzipped | 26,315 / 8,431 | same |
| the YAML, bytes / gzipped | 7,003 / 1,987 | same |
| two independent loads, every name at the same pixel | identical | identical |

The canvas used to draw the plate without a single edge: `edges:` is a list of
`[from, to, kind]` in the YAML and the renderer read it as if it were a list of
objects, so `byId.get(undefined)` skipped every one. It now reads the list, and
the two renderers agree on the count (438 strokes each) because they call the
same `pieces()`, `form()` and `run()`.

Before this pass the same page loaded 1,506,000 bytes, of which the Carina
hero photograph was 229,430. The scene is heavier than the photograph in
JavaScript and lighter overall.

The frame-cost measurements in the previous revision of this file (4.2 ms
median, 4.3 ms p95, CLS 0.0000) were taken before this pass and are not repeated
here; the geometry grew from 261 to 438 segments at the same five draw calls, so
they are no longer what the file does.
