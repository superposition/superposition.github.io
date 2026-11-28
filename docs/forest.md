# The forest

`/forest/` is one 320 × 240 framebuffer, one bear, nineteen parcels and one
light. `docs/scene.md` describes the drawn scenes on `/station/` and the map;
this page is the one drawn by a renderer, and it is the only place on the site
where a reader can change what the picture holds.

## The shot

| | |
| --- | --- |
| framebuffer | 320 × 240, fixed, upscaled by the browser with `image-rendering: pixelated` |
| camera | 58° vertical field, 5.4 units off the bear, rotated into his heading, trailing him by 190 ms |
| light | one `DirectionalLight` from `(2.6, 7.4, −5.4)`, carried with the bear so the direction never changes |
| fog | linear, 12 → 34 units, into `--void` |
| shading | `MeshLambertMaterial`, `flatShading`, vertex colours, no textures, no post |

One light is a rule, not a preference: every face in the frame takes its value
from the same direction, so the shadow side of a parcel is the shadow side of a
tree. Three tones per face, banded by the face's own normal — `paint()` in
`assets/forest/mesh.js` is the only thing that assigns a value.

## The gift

Every repository is a parcel: a box, a lid on a hinge, two ribbons and a bow, a
tag on a pivot, and the repository's plant inside. Nothing is a list on the page.
A reader hops a station at a time; the parcel at that station is the only one
within reach of the bear, and the sentence in the panel is what the parcel holds.

**Placement** is arithmetic in `assets/forest/gifts.js`, seeded per station, and
proven by `node --experimental-default-type=module scripts/forest/gifts.mjs`,
which imports the same module the page draws with:

| rule | why | measured |
| --- | --- | --- |
| one per station | every repository is findable | 19 parcels for 19 pages |
| separation | two boxes closer than one parcel wide read as one object at 320 × 240 | nearest pair 3.82 units, parcel width 1.03 |
| reach | "the bear finds it at his stop" is geometry, not a hope | furthest 1.96 units from its station, limit 2.40 |
| on the ground | a parcel on a slope must not bury a corner | corners −0.077 … +0.073 under the surface |
| behind its fir | the tree is the landmark, so it is further from the path than the box | 19 of 19 |
| own parcel nearest | the one in reach is the one at the reader's feet | 19 of 19 |
| not all in frame | a parcel under eight pixels wide is a dot in the fog; the rest are the wood | at most 12 of 19 legible at one station |

Sides alternate by station, so the hunt zigzags across the path instead of
running down it.

**Opening** is a state machine, not a toggle: `closed → opening (640 ms) → open`.
The ribbon slackens and falls first, then the lid lifts on its hinge and
overshoots its stop on a damped spring, the paper folds flat and pulls in, and
the repository's plant grows out of the box. The last frame of the animation and
the frame after a reload are the same frame, pixel for pixel (0 differing
pixels of 76 800) — `parcel.reset()` puts the springs at zero, so a composed
still is composed. Measured in the parcel's own 30 × 26 box on the screen: the
paper covers 56.4 % of it closed and 5.4 % opened, the plant inside covers 12 %
and 60 %, and the box's mean grey falls from 105 to 56.

The state lives in `localStorage` under `superposition:forest:gifts:v1`, as the
set of slugs that have been opened. A slug survives a reorder of the collection;
a station index does not.

**Two ways in.** The button in the panel is the keyboard path and carries the
accessible name — `Open the parcel holding Cannoli Hell` — and the parcel itself
answers a click or a tap, ray-cast through the camera the picture was drawn with.
Clicking a parcel further up the path moves the bear there as well.

**What does not change.** The nineteen sentences and their links are in the
HTML, rendered by Liquid from `_repos/*.md`, before any script runs; that list is
the page without JavaScript and the fallback when WebGL is absent. The panel is
the text's home, the parcel is its affordance.

## The palette

Six hues, each with one job. Two of them are new here; the rest are the garden's.

| token | hex | meaning | contrast |
| --- | --- | --- | --- |
| `--flora-leaf` | `#2f6b52` | everything that grows: the floor, the firs, the ferns, the plant in the box | 3.24 on `--void`, measured as a fill under a cream outline |
| `--flora-spore` | `#9fe870` | what a plant releases: fern tips, the seed tips in the box | 13.81 on `--void` |
| `--flora-bloom` | `#ff8fa3` | the flower: only inside an opened box, and the label for its species | 9.41 on `--void` |
| `--gift-paper` | `#e0a086` | the wrapping: the brightest manufactured surface in the wood | 9.54 / 8.99 / 9.25 |
| `--gift-ribbon` | `#7a3348` | the tie: the dark band across the paper | 3.98 against `--gift-paper`; 2.39 against the ground, as a band rather than an edge |
| trunk brown | `--dust` × 0.22, `--deep` × 1.6 | bark, stone, the path's edge | the site's own, unchanged |

Type sits on two of them, and only in the panel's chip: `--star` on
`--gift-ribbon` reads at 7.07 / 7.07 / 7.96, and `--void` on `--gift-paper` at
9.54 / 8.99 / 9.25, across the site's three identities. Both pairs are in
`npm run contrast`.

**Value survives the colour.** Measured by hiding each class and diffing the
framebuffer (`scripts/forest/gift-check.mjs`), then converted to grey:

| band | luminance | grey 0–255 | share of the frame |
| --- | --- | --- | --- |
| near (bear, parcels) | 0.2515 | 136 | 5.8 % |
| mid (firs, path, rocks) | 0.0993 | 89 | 57.5 % |
| far (floor) | 0.0167 | 40 | 23.7 % |

By class, in the same frame: bear 141, parcels 114, firs 89, path 86, floor 40.
The parcel is the second-brightest thing in the wood and the only bright thing
that is not the animal, which is what makes it findable in greyscale.

The floor was at the firs' own value in the first build of this pass — one flat
green shape, no depth in greyscale — which is why it sits at a fifth of the leaf
token and the firs at one to one and a half times it.

## The frame

| | before | after |
| --- | --- | --- |
| draw calls | 14 | 25 |
| triangles submitted | 2 128 | 3 654 |
| bear / forest / parcels | 368 / 1 880 / — | 368 / 3 112 / 1 653 |
| forest JavaScript | 61.7 kB | 90.7 kB |
| median frame, 1440 | 4.2 ms | 4.2 ms |
| worst frame, 1440 | 8.4 ms | 12.5 ms |

## Reading the scripts

```
node --experimental-default-type=module scripts/forest/gifts.mjs        # placement, no browser
node scripts/forest/gift-check.mjs --url http://127.0.0.1:4190/forest/  # the live page
```

`gift-check.mjs` needs `puppeteer-core` and a Chromium build, exactly like
`scripts/forest/measure.mjs`. It reports the state machine, the fill of the
parcel's own box before and after, the reload, the two ways in, the value
ladder, the frame time at three widths and the JS weight — and it writes the
stills this page's numbers were argued with.
