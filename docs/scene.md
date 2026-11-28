# Scene layers

Three generated SVG layers from `scripts/scene/` make up the `/station/` scene. Each draws into the same 2400 × 1500 coordinate space with a transparent background and no external references, and the compositor stacks them into `assets/art/station.svg`. Every generator is stdlib-only and seeded: re-running one with the same seed writes byte-identical bytes.

## Station — `scripts/scene/station.py` → `assets/scene/station.svg`

```
python scripts/scene/station.py --seed 1 --out assets/scene/station.svg
```

The station is a single three-dimensional sketch — X along the truss spine, Y up, Z towards the viewer — projected once through a pinhole camera whose principal point is the scene's vanishing point on the horizon (1200, 980), then scaled and centred into the station zone (x 560–1840, y 60–900). Nothing is drawn in 2D directly: rings are circles in the Y–Z plane, modules are faceted tubes, arrays are panel quads on a boom, and the perspective, the ellipse shapes and the left-to-right size falloff all fall out of the projection. The primitive set is small and every primitive takes a handful of parameters: **truss bay** (bay length, truss radius, one diagonal per face), **faceted tube** (axis, length, radius, rib positions, eight longitudinal edges), **collar** (ring, inner ring, four capture latches, cross), **adapter cone**, **habitat ring** (radius, spokes, rim thickness, alternating lit windows), **panel wing** (row count, column count, pitch, deployment fraction), **radiator** (length, width, fin count, mounting angle), **antenna** (mast, struts, dish), **gantry** (leg spread, height, lattice beam), **cable** (sagging polyline), and the **suspended truss section** on the hook. Depth is carried by value and weight, not hue: near faces are cream at 2 or 4 px, hidden faces and the far side are dust at 1 px, and no fill is used, so overlapping members read as an open lattice the way a cutaway technical drawing does. Construction is structural rather than decorative — the near face of one bay is missing with amber caps on the cut longerons, a gantry straddles that bay with a section hanging from its hook on a red-tagged block, two cyan guide lines and a cyan socket collar mark that bay as the live one, and the lower array on the near mast stops part-deployed with its boom continuing as a dashed line to a clamped tip.

| Parameter | Range across seeds | Drives |
| --- | --- | --- |
| `bays` | 10–14 | spine length = bays × bay length |
| `bay_len` | 96–126 | truss panel size and diagonal angle |
| `truss_r` | 42–58 | truss depth, and the size of every module collar |
| `ring_count` | 1–3 | habitat rings on the spine |
| `ring_r` | 150–210, capped at 0.16 L for three rings | ring diameter and spoke length |
| `ring_spokes` | 8–12 | spokes per ring, and one lit window per gap |
| `wing_rows` | 11–16 | rows of panels per array |
| `panel_cols` | 3–5 | panels across an array |
| `panel_pitch` | 16–34 (derived: 0.225–0.265 L ÷ rows) | panel size, and so the array span |
| `module_len` | 96–152 | axial and radial module length |
| `module_r` | 46–74 | module diameter |
| `radiator_count` | 1–2 | radiator fins near the centreline |
| `antenna_count` | 1–2 | dish masts on the spine |
| `open_bay` | middle bay ± 1 | which bay is under construction |
| `yaw` | 17°–27° | truss foreshortening and ring ellipse ratio |
| `roll` | −3°–+3° | spine tilt inside the zone |
| `deploy` | 0.42–0.72 | how much of the lower array is deployed |

Two of those are derived rather than sampled, so that a seed changes the shape without changing the envelope: the panel pitch is chosen from the wing span the seed asks for, and the ring radius is capped by the spine length so three rings stay clear of the open bay. The fit is solved per seed by bisection on camera distance (to the zone's width or height, whichever binds) and on camera height (to centre the drawing vertically), so any seed lands inside the zone with the horizon still at y = 980.

`--seed N` anywhere in 0…2³² renders a different station; the four proofs shipped with the layer are seeds 1, 6, 11 and 26. `--check` re-parses the written file and fails on the layer contract: viewBox, no width/height, a title and `role="img"`, palette-only strokes, weights in {1, 2, 4}, no `filter`/`href`, under 120 KB, and byte-identical to a fresh render of the same seed.
