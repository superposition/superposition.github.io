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
(entry plus four shared modules) 9,470.

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
- `_includes/scene/map.svg` — the same scene projected once, depth-faded, with
  the names set as text. 6.4 KB gzipped.

The geometry the canvas draws comes from `assets/scene/lib/forms.js`, and the
camera and projection from `assets/scene/lib/camera.js` — the same two files the
generator calls. There is no second layout to drift.

Regenerate after adding a repository, a topic, a unit or an entry:

```sh
node --experimental-default-type=module scripts/scene/map.mjs
```

The generator refuses to write when:

- a node would leave the frame at any pose the camera can reach, at 1440 or at
  420 (checked with the node's own radius, not just its centre);
- a node would fall into the band the hero's type stands in;
- two forms would touch, or two labels would overlap;
- an edge names a node that is not on the map;
- the content and the layout disagree about how many of anything there are.

Positions that collide after the seeded jitter are nudged by a fixed local search
(`relax`), and the camera is aimed so the whole map sits in the band the type
leaves for it (`settle`). Both are deterministic: the same content gives the
same file, byte for byte.

## The camera

A pinhole, 26 degrees, on an orbit of radius 9 around a target placed so the
map's centre lands at 0.49 of the frame height. The map's own geometry is
composed for a 1.82 : 1 frame — the home hero's ratio at 1440 by 900 — and the
frame's width is the box's width at every other window shape: a phone shows the
whole plate, smaller, and the black above and below it is the page's own ground.
The SVG obeys the same rule with `preserveAspectRatio="xMidYMid meet"` on the
same 1820 by 1000 viewBox, so the still and the canvas land on the same pixels
at every width.

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
fade. Nothing moves, nothing is downloaded, and the "Hold the map" switch is
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

Strokes are the site's three weights: `--hair` for edges, repository diamonds,
triangles, the journal and the stars; `2 × --hair` for topic rings and the spines
to them; `--rule-thick` for the station. In the SVG they are
`vector-effect: non-scaling-stroke`, so a one-pixel rule is one pixel at every
width. Every colour is a token read from the stylesheet at runtime — no literal
in either renderer.

Every stroke is faded by its distance from the camera (`fade()` in
`camera.js`, floor 0.32 at 1.6× the orbit radius), so the far side of the map
sits behind the near side without a painter's algorithm.

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
| JavaScript, WebGL2, `prefers-reduced-motion: reduce` | the still, whole — the composed still with the composed depth fade |
| JavaScript, WebGL2, three.js fails to load | the still, whole — the canvas is only revealed after a frame has drawn |
| Script blocked after load | the still, whole |
| Everything works | the canvas, at 5 draw calls, over the same composition |

Nothing on the page depends on the canvas. Every node is a link that already
exists below the frame, in the repository list, the topic list, `/series/` and
`/journal/`; the canvas is `aria-hidden`, and hovering a form names it and
clicking it goes there.

## The numbers

Measured on chalant (Windows, Chrome, NVIDIA RTX 4090 via ANGLE/D3D11) and in
headless Chrome on this device, from `_site` built by WSL Ruby 3.0.2:

| | 1440 × 900 | 420 × 900 |
|---|---|---|
| nodes / edges | 31 / 29 | 31 / 29 |
| segments drawn | 261 | 261 |
| draw calls | 5 | 5 |
| triangles | 1,414 | 1,414 |
| points | 460 | 460 |
| main-thread frame cost, median | 4.2 ms | 4.2 ms |
| p95 frame cost | 4.3 ms | 4.2 ms |
| CLS | 0.0000 | 0.0000 |
| home first load, bytes (uncompressed, from the local server) | 1,448,412 | 1,445,354 |
| of which three.js | 748,656 | 748,656 |
| of which the map | 31,224 | 31,224 |
| frame 0, sha256 of the canvas, two independent loads | identical | identical |

Before this change the same page loaded 1,506,000 bytes, of which the Carina
hero photograph was 229,430. The scene is heavier than the photograph in
JavaScript and lighter overall.
