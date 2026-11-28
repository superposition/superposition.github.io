#!/usr/bin/env python3
"""Count hidden-line violations in a station layer — by script, not by eye.

    python scripts/scene/check_occlusion.py assets/scene/station.svg --seed 1
    python scripts/scene/check_occlusion.py OLD.svg --seed 1 --bias 0

The detector does not ask the generator what it clipped. It rebuilds the station
for the seed — the opaque solids, the camera — and for every stroke sample asks
two questions:

  1. is a nearer solid on the ray between this point and the eye?
  2. if so, is the sample at least `--tol` units inside that solid's projected
     silhouette, rather than sitting on the edge the stroke should stop at?

For those samples, a dot of the written file's own ink inside the same pixel is
a violation: a line that passes behind a nearer form and continues through it.
Strokes that stop correctly on the edge are `tol` away from the count, so they
cannot be mistaken for one that runs through.

Exit 1 when a violation is found.
"""

import argparse
import json
import math
import sys

import measure
import station as S


def hull(points):
    pts = sorted(set((round(x, 2), round(y, 2)) for x, y in points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def silhouette(cam, solid):
    """The solid's projected outline, near enough to measure an edge distance."""
    if solid.kind == "plate":
        pts = solid.corners()
        return hull([cam.project(p) for p in pts])
    if solid.kind in ("ann", "disc"):
        rmax = max(solid.r1, solid.r0, solid.hu, solid.hv)
        pts = []
        for k in range(24):
            a = math.tau * k / 24.0
            pts.append(cam.project(S.add(solid.c, S.add(
                S.mul(solid.u, rmax * math.cos(a)), S.mul(solid.v, rmax * math.sin(a))))))
        return hull(pts)
    return hull([cam.project(p) for p in solid.corners()])


def inside_distance(poly, pt):
    """Positive when the point is inside the polygon: its distance to the edge."""
    if len(poly) < 3:
        return -1.0
    x, y = pt
    inside = False
    best = 1e9
    for i in range(len(poly)):
        a = poly[i]
        b = poly[(i + 1) % len(poly)]
        if (a[1] > y) != (b[1] > y):
            xin = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if xin > x:
                inside = not inside
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln2 = dx * dx + dy * dy
        t = 0.0 if ln2 < 1e-12 else max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / ln2))
        d = math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t))
        best = min(best, d)
    return best if inside else -best


def main(argv=None):
    ap = argparse.ArgumentParser(description="Count hidden-line violations.")
    ap.add_argument("svg")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--bias", type=float, default=S.BIAS_X)
    ap.add_argument("--step", type=float, default=2.5)
    ap.add_argument("--tol", type=float, default=0.5, help="ink distance that counts as ink on the sample")
    ap.add_argument("--edge", type=float, default=2.0, help="how far inside the silhouette counts as deep")
    ap.add_argument("--json", default="")
    ap.add_argument("--attribute", choices=("class", "collinear"), default="class",
                    help="class: same ink class and group as the stroke, and not the occluder's own edge; "
                         "collinear: any ink continuing the stroke's direction (the only rule an older "
                         "file without group ids can be measured by)")
    args = ap.parse_args(argv)

    st, sk, cam, bb, mast, ink, kept, occ = S.build_scene(args.seed, args.bias)
    eye = cam.eye()
    occs = S.Occluders(cam)
    for solid in sk.solids:
        occs.add(solid)
    shapes = [(solid, silhouette(cam, solid)) for solid, _box in occs.items]

    # The file's ink as segments, bucketed by an 8-unit cell, so a query is a
    # true distance in units rather than a pixel count: a stroke that stops a
    # pixel short of where it should is not a violation, and a neighbour's ink
    # is not mistaken for this stroke's.
    cell = 8.0
    index = {}
    strokes = 0
    for stroke in measure.collect(args.svg):
        if stroke.text or len(stroke.points) < 2:
            continue
        strokes += 1
        for a, b in zip(stroke.points, stroke.points[1:]):
            x0, y0 = min(a[0], b[0]), min(a[1], b[1])
            x1, y1 = max(a[0], b[0]), max(a[1], b[1])
            for gx in range(int(x0 // cell), int(x1 // cell) + 1):
                for gy in range(int(y0 // cell), int(y1 // cell) + 1):
                    index.setdefault((gx, gy), []).append(
                        (a, b, stroke.group, (stroke.colour or "").lower(), int(round(stroke.width))))

    # The occluders' own outlines, projected: an occluder's rim or panel edge is
    # not the hidden stroke continuing, so ink within a pixel of it is excused.
    own = {}
    for item in sk.items:
        if not item["owner"]:
            continue
        cells = own.setdefault(item["owner"], set())
        pts = item["pts"]
        for a, b in zip(pts, pts[1:]):
            pa = cam.project(a)
            pb = cam.project(b)
            n = max(1, int(math.ceil(math.hypot(pb[0] - pa[0], pb[1] - pa[1]))))
            for k in range(n + 1):
                t = k / float(n)
                cells.add((int(round(pa[0] + (pb[0] - pa[0]) * t)),
                           int(round(pa[1] + (pb[1] - pa[1]) * t))))

    def on_owner_edge(x, y, owner):
        cells = own.get(owner)
        if not cells:
            return False
        cx, cy = int(round(x)), int(round(y))
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (cx + dx, cy + dy) in cells:
                    return True
        return False

    def ink_along(x, y, direction, cls=None):
        """Ink that continues this stroke: within half a unit AND within 22
        degrees of its own direction. A crossing member, or the occluder's own
        rim a fraction of a unit away, is not this stroke still being drawn."""
        gx, gy = int(x // cell), int(y // cell)
        dx0, dy0 = direction
        best = 1e9
        for ix in (gx - 1, gx, gx + 1):
            for iy in (gy - 1, gy, gy + 1):
                for (a, b, _g, col, wid) in index.get((ix, iy), ()):
                    if cls is not None and (col, wid) != cls:
                        continue
                    dx, dy = b[0] - a[0], b[1] - a[1]
                    ln2 = dx * dx + dy * dy
                    if ln2 < 1e-9:
                        continue
                    ln = math.sqrt(ln2)
                    if abs((dx * dy0 - dy * dx0) / ln) > 0.37:
                        continue
                    t = max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / ln2))
                    d = math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t))
                    if d < best:
                        best = d
        return best

    def ink_distance(x, y, group=None):
        """Distance to the nearest ink of `group` (the stroke's own class).

        Attribution matters: a hidden truss member crossing behind a habitat
        ring has the ring's own rim ink a fraction of a unit away, and counting
        that as the truss's ink would report a violation where the clipper did
        its job. So the question is only ever "does this stroke, or another
        stroke of its own class, still have ink here"."""
        gx, gy = int(x // cell), int(y // cell)
        best = 1e9
        for ix in (gx - 1, gx, gx + 1):
            for iy in (gy - 1, gy, gy + 1):
                for (a, b, g) in index.get((ix, iy), ()):
                    if group is not None and g != group:
                        continue
                    dx, dy = b[0] - a[0], b[1] - a[1]
                    ln2 = dx * dx + dy * dy
                    t = 0.0 if ln2 < 1e-12 else max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / ln2))
                    d = math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t))
                    if d < best:
                        best = d
        return best

    samples = 0
    hidden = 0
    deep = 0
    violations = 0
    per_solid = {}
    for item in sk.items:
        pts = item["pts"]
        dense = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            sa = cam.project(a)
            sb = cam.project(b)
            n = max(1, int(math.ceil(math.hypot(sb[0] - sa[0], sb[1] - sa[1]) / args.step)))
            for k in range(1, n + 1):
                dense.append(S.lerp(a, b, k / float(n)))
        if item["closed"] and dense[0] != dense[-1]:
            dense.append(dense[0])
        for k, p in enumerate(dense):
            prev = dense[max(0, k - 1)]
            nxt = dense[min(len(dense) - 1, k + 1)]
            a2 = cam.project(prev)
            b2 = cam.project(nxt)
            tl = math.hypot(b2[0] - a2[0], b2[1] - a2[1]) or 1.0
            tangent = ((b2[0] - a2[0]) / tl, (b2[1] - a2[1]) / tl)
            screen = cam.project(p)
            if not (-40.0 <= screen[0] <= 2440.0 and -40.0 <= screen[1] <= 1540.0):
                continue
            samples += 1
            ray = S.sub(p, eye)
            hit = None
            for solid, box in occs.items:
                if solid.owner == item["owner"]:
                    continue
                if not (box[0] - 4 <= screen[0] <= box[2] + 4 and box[1] - 4 <= screen[1] <= box[3] + 4):
                    continue
                if solid.hit(eye, ray, 1.0):
                    hit = solid
                    break
            if hit is None:
                continue
            hidden += 1
            poly = dict((id(s), sh) for s, sh in shapes)[id(hit)] if False else None
            for solid, sh in shapes:
                if solid is hit:
                    poly = sh
                    break
            dist = inside_distance(poly, screen)
            if dist <= args.edge:
                continue
            deep += 1
            if args.attribute == "class" and on_owner_edge(screen[0], screen[1], hit.owner):
                continue
            role, tone, weight, opacity, lit = ink.classify(item)
            cls = (tone.lower(), weight) if args.attribute == "class" else None
            if ink_along(screen[0], screen[1], tangent, cls) <= args.tol:
                violations += 1
                per_solid[hit.kind] = per_solid.get(hit.kind, 0) + 1

    out = {
        "file": args.svg,
        "seed": args.seed,
        "bias": args.bias,
        "ink_strokes": strokes,
        "samples": samples,
        "hidden_samples": hidden,
        "hidden_fraction": round(hidden / max(1, samples), 3),
        "deep_hidden_samples": deep,
        "violations": violations,
        "violation_fraction": round(violations / max(1, deep), 3),
        "by_occluder": per_solid,
    }
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1)
    print(json.dumps(out, indent=1))
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
