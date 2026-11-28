#!/usr/bin/env python3
"""Parametric space-station layer for the shared scene at 2400 x 1500.

    python scripts/scene/station.py --seed 3 --out assets/scene/station.svg
    python scripts/scene/station.py --report          # the occlusion and value report

The station is built in its own three-dimensional frame (X along the truss
spine, Y up, Z towards the viewer), projected once through a pinhole camera
whose principal point is the scene's vanishing point on the horizon (x 1200,
y 980), then fitted into the station zone.  Every element is a function of the
parameter block in Station.__init__; the seed only chooses values inside those
ranges, so any seed draws a plausible station.

Three things make this a drawing rather than a wireframe:

  Occlusion.  Every opaque form registers a solid — a tube, a solar wing, a
  radiator, a habitat ring's rim band, a dish, the hanging truss section's box.
  After the sketch is built, every stroke is walked in screen steps of 2.5
  units and tested against the solids nearer than it: where a nearer form
  covers it, the stroke is cut, and the cut is bisected to land on the
  occluding silhouette.  A form never occludes its own strokes.

  One light.  LIGHT is a single direction in the station's frame, and every
  stroke carries the normal of the face it belongs to.  The lit side of a
  member is drawn heavier than its shadow side, at every depth: the light is
  weight, and it never moves between layers or seeds.

  Three values.  Depth sets the ink: near structure is cream, the middle
  distance is dust, the far field is dust at half opacity.  Pure light — cream
  at weight 4 — is reserved for the nearest primary silhouette, and measures
  about 5 % of the ink.

Stdlib only; the same seed writes byte-identical output.
"""

import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET

W = 2400.0
ZONE = (560.0, 60.0, 1840.0, 900.0)
HORIZON = 980.0
FOCAL = 2900.0

CREAM = "#efe6d3"
DUST = "#a79085"
AMBER = "#ffc24a"
CYAN = "#8fd3ff"
RED = "#e2402f"
TONE_ORDER = (DUST, CREAM, AMBER, CYAN, RED)
ROLE_TONE = {"near": CREAM, "mid": DUST, "far": DUST}
FAR_OPACITY = 0.5
DOWN = {4: 2, 2: 1, 1: 1}
TAU = 2.0 * math.pi
SVG_NS = "{http://www.w3.org/2000/svg}"

# The one light: high, from the left of the drawing, a little towards the
# viewer. Every normal in this file is lit against this vector and nothing else.
LIGHT = (0.46, 0.78, 0.43)
LIT = 0.16  # cos(80 degrees): under this a face counts as in shadow

# Detail pitches, in station units. They are the scale cues: a viewer infers the
# structure's size from how small its smallest true detail is. The truss rungs
# are one third of a bay, so they hold their pitch across seeds while the bay
# length varies; the ring seams are angular because a ring's radius varies.
RUNG_FRACTION = 1.0 / 3.0
RING_SEAMS = 24
ANTENNA_RUNG = 13.0
GANTRY_TIE = 26.0
COLLAR_BOLTS = 6

# The crop: the gantry's mast is extended until its top leaves the top of the
# frame. One element leaving the frame is the composition's asymmetry.
CROP_TOP = -40.0
BIAS_X = 96.0


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def length(a):
    return math.sqrt(dot(a, a))


def unit(a):
    l = length(a)
    if l < 1e-9:
        return (0.0, 0.0, 1.0)
    return (a[0] / l, a[1] / l, a[2] / l)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def basis(axis):
    a = unit(axis)
    ref = (0.0, 1.0, 0.0) if abs(a[1]) < 0.85 else (1.0, 0.0, 0.0)
    u = unit(cross(a, ref))
    return u, cross(a, u)


def ring_points(centre, u, v, radius, n, phase=0.0):
    out = []
    for k in range(n):
        a = phase + TAU * k / n
        out.append(add(centre, add(mul(u, radius * math.cos(a)), mul(v, radius * math.sin(a)))))
    return out


def radial_normal(u, v, a):
    return unit(add(mul(u, math.cos(a)), mul(v, math.sin(a))))


def rot_y(p, angle):
    c = math.cos(angle)
    s = math.sin(angle)
    return (p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c)


def fmt(value):
    v = round(value, 1)
    if v == 0.0:
        return "0"
    if v == int(v):
        return str(int(v))
    return "%.1f" % v


class Rng:
    """mulberry32: small, seedable, identical on every Python 3."""

    def __init__(self, seed):
        self.s = (int(seed) * 2654435761 + 1013904223) & 0xFFFFFFFF

    def u32(self):
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.s
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return (t ^ (t >> 14)) & 0xFFFFFFFF

    def rand(self):
        return self.u32() / 4294967296.0

    def uni(self, a, b):
        return a + (b - a) * self.rand()

    def rint(self, a, b):
        return a + int(self.rand() * (b - a + 1))


class Camera:
    def __init__(self, yaw, roll):
        self.yaw = yaw
        self.roll = roll
        self.y0 = 0.0
        self.z0 = 3000.0
        self.cx = W * 0.5
        self.cy = HORIZON
        self.f = FOCAL

    def rotate(self, p):
        c = math.cos(self.yaw)
        s = math.sin(self.yaw)
        x = p[0] * c + p[2] * s
        z = -p[0] * s + p[2] * c
        y = p[1]
        cr = math.cos(self.roll)
        sr = math.sin(self.roll)
        return (x * cr - y * sr, x * sr + y * cr + self.y0, z + self.z0)

    def project(self, p):
        x, y, z = self.rotate(p)
        return (self.cx + self.f * x / z, self.cy - self.f * y / z)

    def depth(self, p):
        return self.rotate(p)[2]

    def eye(self):
        """The pinhole itself, in the station's own frame."""
        cr = math.cos(self.roll)
        sr = math.sin(self.roll)
        x1 = -self.y0 * sr
        y1 = -self.y0 * cr
        z1 = -self.z0
        c = math.cos(self.yaw)
        s = math.sin(self.yaw)
        return (x1 * c - z1 * s, y1, x1 * s + z1 * c)

    def size_of(self, p):
        """Screen size of one station unit at p — used for occlusion stepping."""
        return self.f / self.rotate(p)[2]


# --- solids -----------------------------------------------------------------


class Solid:
    """An opaque form, in the station's frame, that other strokes are clipped by."""

    __slots__ = ("kind", "owner", "c", "u", "v", "n", "hu", "hv", "r0", "r1", "p0", "p1", "radius")

    def __init__(self, kind, owner, **kw):
        self.kind = kind
        self.owner = owner
        self.c = kw.get("c")
        self.u = kw.get("u")
        self.v = kw.get("v")
        self.n = kw.get("n")
        self.hu = kw.get("hu", 0.0)
        self.hv = kw.get("hv", 0.0)
        self.r0 = kw.get("r0", 0.0)
        self.r1 = kw.get("r1", 0.0)
        self.p0 = kw.get("p0")
        self.p1 = kw.get("p1")
        self.radius = kw.get("radius", 0.0)

    def corners(self):
        """Sample points on the solid, enough for a screen-space bounding box."""
        out = []
        if self.kind in ("plate", "ann", "disc"):
            rmax = max(self.hu, self.hv, self.r1, self.r0)
            if self.kind == "plate":
                for su in (-1, 1):
                    for sv in (-1, 1):
                        out.append(add(self.c, add(mul(self.u, self.hu * su), mul(self.v, self.hv * sv))))
                return out
            for k in range(12):
                a = TAU * k / 12.0
                out.append(add(self.c, add(mul(self.u, rmax * math.cos(a)), mul(self.v, rmax * math.sin(a)))))
            return out
        if self.kind == "cyl":
            axis = sub(self.p1, self.p0)
            u, v = basis(axis)
            for base in (self.p0, self.p1):
                for k in range(8):
                    a = TAU * k / 8.0
                    out.append(add(base, add(mul(u, self.radius * math.cos(a)),
                                             mul(v, self.radius * math.sin(a)))))
            return out
        return [self.c]

    def hit(self, eye, d, tmax):
        """True when the ray eye+t*d, 0<t<tmax, meets this solid."""
        if self.kind == "plate":
            den = dot(d, self.n)
            if abs(den) < 1e-9:
                return False
            t = dot(sub(self.c, eye), self.n) / den
            if not (1e-4 < t < tmax):
                return False
            p = sub(add(eye, mul(d, t)), self.c)
            return abs(dot(p, self.u)) <= self.hu and abs(dot(p, self.v)) <= self.hv
        if self.kind in ("ann", "disc"):
            den = dot(d, self.n)
            if abs(den) < 1e-9:
                return False
            t = dot(sub(self.c, eye), self.n) / den
            if not (1e-4 < t < tmax):
                return False
            p = sub(add(eye, mul(d, t)), self.c)
            rad = length(p)
            return self.r0 <= rad <= self.r1
        if self.kind == "cyl":
            axis = unit(sub(self.p1, self.p0))
            h = dot(sub(self.p1, self.p0), axis)
            ce = sub(eye, self.p0)
            de = dot(d, axis)
            cee = dot(ce, axis)
            d2 = sub(d, mul(axis, de))
            ce2 = sub(ce, mul(axis, cee))
            a = dot(d2, d2)
            if a < 1e-12:
                return False
            b = 2.0 * dot(d2, ce2)
            c = dot(ce2, ce2) - self.radius * self.radius
            disc = b * b - 4.0 * a * c
            if disc < 0:
                return False
            sq = math.sqrt(disc)
            for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
                if 1e-4 < t < tmax:
                    axial = cee + t * de
                    if 0.0 <= axial <= h:
                        return True
            return False
        return False


class Occluders:
    """The opaque set, with a screen-space bounding box per solid for cheap rejects."""

    def __init__(self, cam):
        self.cam = cam
        self.items = []

    def add(self, solid):
        pts = [self.cam.project(p) for p in solid.corners()]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        self.items.append((solid, (min(xs), min(ys), max(xs), max(ys))))
        return solid.owner

    def hides(self, p, screen, owner, eye, max_screen=3.0):
        """Is the point at p hidden from the eye by any solid but its own?"""
        d = sub(p, eye)
        for solid, box in self.items:
            if solid.owner == owner:
                continue
            if not (box[0] - max_screen <= screen[0] <= box[2] + max_screen
                    and box[1] - max_screen <= screen[1] <= box[3] + max_screen):
                continue
            if solid.hit(eye, d, 1.0):
                return True
        return False


# --- the sketch -------------------------------------------------------------


class Sketch:
    """Strokes in the station's frame, each with the normal of its face."""

    def __init__(self):
        self.items = []
        self.solids = []
        self.serial = 0

    def add(self, pts, rank=1, normal=(0.0, 0.0, 1.0), owner=None, group="body",
            closed=False, dash="", tone=None):
        if len(pts) < 2:
            return
        self.items.append({
            "pts": list(pts), "rank": rank, "n": normal, "owner": owner,
            "group": group, "closed": closed, "dash": dash, "tone": tone,
        })

    def new_owner(self, kind, **kw):
        self.serial += 1
        owner = "%s-%d" % (kind, self.serial)
        solid = Solid(kind, owner, **kw)
        self.solids.append(solid)
        return owner, solid

    def points(self):
        return [p for item in self.items for p in item["pts"]]


class Station:
    def __init__(self, rng):
        self.rng = rng
        r = rng
        self.bays = r.rint(10, 14)
        self.bay_len = float(r.rint(96, 126))
        self.truss_r = float(r.rint(42, 58))
        self.ring_count = r.rint(1, 3)
        self.ring_r = float(r.rint(150, 210))
        self.ring_spokes = r.rint(8, 12)
        self.module_len = float(r.rint(96, 152))
        self.module_r = float(r.rint(46, 74))
        self.wing_rows = r.rint(11, 16)
        self.panel_cols = r.rint(3, 5)
        self.radiator_count = r.rint(1, 2)
        self.antenna_count = r.rint(1, 2)
        self.yaw = math.radians(r.uni(17.0, 27.0))
        self.roll = math.radians(r.uni(-3.0, 3.0))
        self.open_bay = min(max(self.bays // 2 + r.rint(-1, 1), 2), self.bays - 3)
        self.L = self.bays * self.bay_len
        cap = 0.16 * self.L if self.ring_count >= 3 else 0.30 * self.L
        self.ring_r = min(self.ring_r, cap)
        span = self.L * r.uni(0.225, 0.265)
        self.panel_pitch = round(min(34.0, max(16.0, span / self.wing_rows * r.uni(0.95, 1.05))), 1)
        self.deploy = r.uni(0.42, 0.72)
        self.sk = Sketch()
        self.gantry_top = None

    def x(self, frac):
        return frac * self.L

    # -- the spine ----------------------------------------------------------

    def truss(self):
        r = self.truss_r
        half = self.L * 0.5
        rung = self.bay_len * RUNG_FRACTION
        for sy, sz in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0)):
            near = sz > 0.0
            n = unit((0.0, sy, sz))
            for i in range(self.bays):
                if i == self.open_bay and sz > 0.0:
                    continue
                x0 = -half + i * self.bay_len
                self.sk.add([(x0, sy * r, sz * r), (x0 + self.bay_len, sy * r, sz * r)],
                            rank=0 if (near and sy < 0.0) else 1, normal=n)
        for i in range(self.bays + 1):
            xb = -half + i * self.bay_len
            open_edge = i == self.open_bay or i == self.open_bay + 1
            for a, b, normal in (
                ((xb, r, r), (xb, r, -r), (0.0, 1.0, 0.0)),
                ((xb, -r, -r), (xb, -r, r), (0.0, -1.0, 0.0)),
                ((xb, -r, -r), (xb, r, -r), (0.0, 0.0, -1.0)),
                ((xb, -r, r), (xb, r, r), (0.0, 0.0, 1.0)),
            ):
                if open_edge and normal[2] > 0.0:
                    self.sk.add([a, b], rank=1, normal=normal, tone=CYAN)
                else:
                    self.sk.add([a, b], rank=1, normal=normal)
        for i in range(self.bays):
            x0 = -half + i * self.bay_len
            x1 = x0 + self.bay_len
            for c0, c1, normal in (
                ((r, r), (r, -r), (0.0, 0.0, 1.0)),
                ((-r, r), (-r, -r), (0.0, 0.0, -1.0)),
                ((r, r), (-r, r), (0.0, 1.0, 0.0)),
                ((r, -r), (-r, -r), (0.0, -1.0, 0.0)),
            ):
                if i == self.open_bay and c0 == (r, r) and c1 == (-r, r):
                    continue
                if i % 2:
                    a, b = (x0, c0[0], c0[1]), (x1, c1[0], c1[1])
                else:
                    a, b = (x0, c1[0], c1[1]), (x1, c0[0], c0[1])
                self.sk.add([a, b], rank=1, normal=normal)
        # Rungs: one third of a bay apart on the near bottom chord, and their
        # shadow-side twins on the far chord. This is the station's clock: the
        # pitch is the same in every seed and every bay.
        y = -half
        while y < half - rung * 0.5:
            y = min(y + rung, half)
            self.sk.add([(y, -r, r), (y, -r, r - 9.0)], rank=2, normal=(0.0, 0.0, 1.0), group="rungs")
            self.sk.add([(y, r, -r), (y, r, -r + 7.0)], rank=2, normal=(0.0, 0.0, -1.0), group="rungs")
            if abs(y) < half - 1.0:
                self.sk.add([(y, -r + 2.0, r), (y, -r * 0.45, r)], rank=2, normal=(0.0, 0.0, 1.0),
                            group="rungs")
        for sy in (1.0, -1.0):
            for i in (self.open_bay, self.open_bay + 1):
                xb = -half + i * self.bay_len
                inward = -1.0 if i == self.open_bay else 1.0
                self.sk.add([(xb, sy * r, r), (xb + inward * self.bay_len * 0.16, sy * r, r)],
                            rank=1, normal=(0.0, 0.0, 1.0), tone=AMBER)
        self.open_bay_guide()

    def open_bay_guide(self):
        r = self.truss_r
        half = self.L * 0.5
        x0 = -half + self.open_bay * self.bay_len
        x1 = x0 + self.bay_len
        top = r + 150.0
        for xb in (x0 + 5.0, x1 - 5.0):
            self.sk.add([(xb, top, r + 3.0), (xb, -r, r + 3.0)], rank=2, normal=(0.0, 0.0, 1.0),
                        dash="16 12", tone=CYAN)

    # -- modules ------------------------------------------------------------

    def tube(self, p0, p1, radius, sides=8, ribs=(0.34, 0.68), cap=True, cap_tone=None,
             group="body", rank=1):
        axis = sub(p1, p0)
        u, v = basis(axis)
        a = unit(axis)
        owner, solid = self.sk.new_owner("cyl", p0=p0, p1=p1, radius=radius)
        r0 = ring_points(p0, u, v, radius, sides)
        r1 = ring_points(p1, u, v, radius, sides)
        for k in range(sides):
            ang = TAU * k / sides
            o = add(mul(u, radius * math.cos(ang)), mul(v, radius * math.sin(ang)))
            self.sk.add([add(p0, o), add(p1, o)], rank=rank, normal=radial_normal(u, v, ang),
                        owner=owner, group=group)
        self.sk.add(r0 + [r0[0]], rank=rank, normal=mul(a, -1.0), owner=owner, group=group)
        self.sk.add(r1 + [r1[0]], rank=rank, normal=a, owner=owner, group=group)
        for f in ribs:
            c = add(p0, mul(axis, f))
            rp = ring_points(c, u, v, radius, sides)
            self.sk.add(rp + [rp[0]], rank=2, normal=a, owner=owner, group=group)
        if cap:
            self.collar(p1, axis, radius * 0.62, cap_tone or CREAM, group=group)

    def collar(self, centre, axis, radius, tone=None, group="body"):
        u, v = basis(axis)
        owner, solid = self.sk.new_owner("ann", c=centre, u=u, v=v, n=unit(axis),
                                         r0=radius * 0.62, r1=radius * 1.24)
        ring = ring_points(centre, u, v, radius, 12)
        self.sk.add(ring + [ring[0]], rank=1, normal=unit(axis), owner=owner, group=group, tone=tone)
        inner = ring_points(centre, u, v, radius * 0.62, 8)
        self.sk.add(inner + [inner[0]], rank=2, normal=unit(axis), owner=owner, group=group,
                    tone=tone)
        for k in range(COLLAR_BOLTS):
            ang = TAU * k / COLLAR_BOLTS + TAU / 12.0
            edge = radial_normal(u, v, ang)
            self.sk.add([add(centre, mul(edge, radius)),
                         add(centre, mul(edge, radius * 1.24))],
                        rank=2, normal=edge, owner=owner, group=group, tone=tone)
        self.sk.add([add(centre, mul(u, radius * 0.30)), add(centre, mul(u, -radius * 0.30))],
                    rank=2, normal=unit(axis), owner=owner, group=group, tone=tone)
        self.sk.add([add(centre, mul(v, radius * 0.30)), add(centre, mul(v, -radius * 0.30))],
                    rank=2, normal=unit(axis), owner=owner, group=group, tone=tone)

    def adapter(self, centre, axis, radius):
        u, v = basis(axis)
        a = ring_points(centre, u, v, radius, 8)
        b = ring_points(add(centre, mul(axis, -14.0)), u, v, radius * 1.22, 8)
        for k in range(8):
            ang = TAU * k / 8.0
            self.sk.add([a[k], b[k]], rank=2, normal=radial_normal(u, v, ang))

    def axial_modules(self):
        half = self.L * 0.5
        mr = self.module_r
        self.tube((-half, 0.0, 0.0), (-half - self.module_len * 0.95, 0.0, 0.0), mr, 8)
        self.adapter((-half, 0.0, 0.0), (-1.0, 0.0, 0.0), mr)
        self.tube((half, 0.0, 0.0), (half + self.module_len * 0.8, 0.0, 0.0), mr * 0.86, 8)
        self.adapter((half, 0.0, 0.0), (1.0, 0.0, 0.0), mr)

    def radial_module(self, xf, sign, rscale=1.0):
        r = self.truss_r
        ln = self.module_len * 1.15 * rscale
        radius = self.module_r * 0.92 * rscale
        p0 = (self.x(xf), sign * (r + 8.0), 0.0)
        p1 = (self.x(xf), sign * (r + 8.0) + sign * ln, 0.0)
        self.tube(p0, p1, radius, 8, group="modules")
        self.collar(add(p1, mul((0.0, sign, 0.0), 8.0)), (0.0, sign, 0.0), radius * 0.58,
                    AMBER, group="modules")

    # -- the ring -----------------------------------------------------------

    def habitat_ring(self, frac, radius, spokes, phase):
        cx = self.x(frac)
        up = (0.0, 1.0, 0.0)
        fw = (0.0, 0.0, 1.0)
        owner, solid = self.sk.new_owner("ann", c=(cx, 0.0, 0.0), u=up, v=fw, n=(1.0, 0.0, 0.0),
                                         r0=radius * 0.88, r1=radius * 1.03)
        rim = ring_points((cx, 0.0, 0.0), up, fw, radius, 60)
        inner = ring_points((cx, 0.0, 0.0), up, fw, radius * 0.88, 60)
        for k in range(60):
            ang = TAU * k / 60.0
            n = radial_normal(up, fw, ang)
            self.sk.add([rim[k], rim[(k + 1) % 60]], rank=0, normal=n, owner=owner, group="rings")
        for k in range(60):
            ang = TAU * k / 60.0
            n = radial_normal(up, fw, ang)
            self.sk.add([inner[k], inner[(k + 1) % 60]], rank=2, normal=mul(n, -1.0), owner=owner,
                        group="rings")
        for k in range(spokes):
            ang = phase + TAU * k / spokes
            self.sk.add([(cx, 0.0, 0.0), (cx, radius * 0.88 * math.cos(ang), radius * 0.88 * math.sin(ang))],
                        rank=1, normal=(1.0, 0.0, 0.0), owner=owner, group="rings")
        # Seams: a fixed angular pitch, the ring's own scale cue. They alternate
        # with the lit windows, so a ring reads as plating with lamps in it.
        for k in range(RING_SEAMS):
            ang = phase + TAU * k / RING_SEAMS
            lit = (k * 5) % 12 < 3
            p = (cx, radius * 0.93 * math.cos(ang), radius * 0.93 * math.sin(ang))
            q = (cx, radius * 1.03 * math.cos(ang), radius * 1.03 * math.sin(ang))
            self.sk.add([p, q], rank=2, normal=radial_normal(up, fw, ang), owner=owner,
                        group="seams", tone=AMBER if lit else None)
        for rad, rank in ((0.17, 1), (0.10, 2)):
            hub = ring_points((cx, 0.0, 0.0), up, fw, radius * rad, 8, TAU / 16.0)
            self.sk.add(hub + [hub[0]], rank=rank, normal=(1.0, 0.0, 0.0), owner=owner, group="rings")

    # -- wings --------------------------------------------------------------

    def panel(self, centre, u, v, hu, hv, rank=1, tone=None, grid=0, owner=None, group="body"):
        n = unit(cross(u, v))
        if dot(n, (0.0, 0.0, 1.0)) < 0.0:
            n = mul(n, -1.0)
        self.sk.add([add(centre, add(mul(u, hu), mul(v, hv))),
                     add(centre, add(mul(u, -hu), mul(v, hv))),
                     add(centre, add(mul(u, -hu), mul(v, -hv))),
                     add(centre, add(mul(u, hu), mul(v, -hv)))], rank=rank, normal=n,
                    owner=owner, group=group, tone=tone, closed=True)
        for k in range(1, grid):
            t = -1.0 + 2.0 * k / grid
            self.sk.add([add(centre, add(mul(u, hu * t), mul(v, hv))),
                         add(centre, add(mul(u, hu * t), mul(v, -hv)))], rank=2, normal=n,
                        owner=owner, group=group, tone=tone)

    def wing(self, frac, sign, rows, cols, pitch, state):
        r = self.truss_r
        root = (self.x(frac), sign * (r + 10.0), 0.0)
        d = unit((0.16, sign, 0.36))
        c = unit((1.0, 0.0, -0.12))
        c = unit(sub(c, mul(d, dot(c, d))))
        across = pitch * 1.12
        width = cols * across
        span = rows * pitch
        tip = add(root, mul(d, span + pitch * 1.4))
        full = rows if state == "full" else max(4, int(round(rows * self.deploy)))
        front = add(root, mul(d, pitch * 0.8 + full * pitch))
        normal = unit(cross(d, c))
        if dot(normal, (0.0, 0.0, 1.0)) < 0.0:
            normal = mul(normal, -1.0)
        # The array is one opaque plane: lines behind it end at its silhouette.
        owner, solid = self.sk.new_owner(
            "plate", c=add(root, mul(d, (span + pitch * 1.4) * 0.5)),
            u=d, v=c, n=normal, hu=(span + pitch * 1.4) * 0.5, hv=width * 0.5)
        for edge in (-0.5, 0.5):
            self.sk.add([add(root, mul(c, edge * width)), add(front, mul(c, edge * width))],
                        rank=0, normal=normal, owner=owner, group="wings")
        for i in range(full):
            for j in range(cols):
                centre = add(add(root, mul(d, pitch * 0.8 + (i + 0.5) * pitch)),
                             mul(c, (j - (cols - 1) * 0.5) * across))
                self.panel(centre, d, c, pitch * 0.44, across * 0.44, rank=2, owner=owner,
                           group="wings")
            if i % 4 == 0:
                rail = add(root, mul(d, pitch * 0.8 + (i + 0.5) * pitch))
                self.sk.add([add(rail, mul(c, width * 0.5)), add(rail, mul(c, -width * 0.5))],
                            rank=1, normal=normal, owner=owner, group="wings")
        self.sk.add([add(front, mul(c, width * 0.5)), add(front, mul(c, -width * 0.5))],
                    rank=0, normal=normal, owner=owner, group="wings")
        self.sk.add([add(root, mul(c, width * 0.5)), add(root, mul(c, -width * 0.5))],
                    rank=1, normal=normal, owner=owner, group="wings")
        self.sk.add([root, front], rank=1, normal=normal, owner=owner, group="wings")
        if state != "full":
            n = unit(add(cross(d, c), d))
            for k in range(4):
                c0 = add(add(front, mul(d, pitch * (0.6 + k * 0.5))), mul(n, k * 3.0))
                self.panel(c0, d, c, pitch * 0.20, across * 0.13, rank=2, owner=owner,
                           group="wings")
            hold = add(front, mul(d, pitch * 2.4))
            self.sk.add([front, add(tip, mul(n, 10.0))], rank=2, normal=normal, dash="12 10",
                        owner=owner, group="wings")
            for edge in (-0.5, 0.5):
                self.sk.add([add(front, mul(c, edge * width)), add(hold, mul(c, edge * width))],
                            rank=1, normal=normal, tone=AMBER, owner=owner, group="wings")
            self.sk.add([add(hold, mul(c, width * 0.5)), add(hold, mul(c, -width * 0.5))],
                        rank=2, normal=normal, tone=AMBER, owner=owner, group="wings")

    def radiator(self, frac, sign, angle):
        r = self.truss_r
        root = (self.x(frac), sign * (r + 4.0), 6.0)
        d = unit((math.sin(angle) * 0.35, sign * math.cos(angle) * 0.9, 0.45))
        c = unit((1.0, 0.0, -0.2))
        c = unit(sub(c, mul(d, dot(c, d))))
        ln = self.module_len * 1.45
        wd = self.truss_r * 1.5
        centre = add(root, mul(d, ln * 0.5))
        normal = unit(cross(d, c))
        if dot(normal, (0.0, 0.0, 1.0)) < 0.0:
            normal = mul(normal, -1.0)
        owner, solid = self.sk.new_owner("plate", c=centre, u=d, v=c, n=normal,
                                         hu=ln * 0.5, hv=wd * 0.5)
        self.panel(centre, d, c, ln * 0.5, wd * 0.5, rank=0, owner=owner, group="radiators")
        for k in range(1, 7):
            t = -1.0 + 2.0 * k / 7.0
            self.sk.add([add(centre, add(mul(d, ln * 0.5 * t), mul(c, wd * 0.5))),
                         add(centre, add(mul(d, ln * 0.5 * t), mul(c, -wd * 0.5)))],
                        rank=2, normal=normal, owner=owner, group="radiators")
        self.sk.add([root, add(root, mul(d, ln))], rank=2, normal=normal, owner=owner,
                    group="radiators")
        hinge = ring_points(root, (0.0, 1.0, 0.0), (0.0, 0.0, 1.0), 7.0, 8)
        self.sk.add(hinge + [hinge[0]], rank=2, normal=(0.0, 0.0, 1.0), owner=owner,
                    group="radiators")

    # -- masts --------------------------------------------------------------

    def antenna(self, frac, sign, scale=1.0, group="masts"):
        r = self.truss_r
        root = (self.x(frac), sign * r, 0.0)
        blast = (58.0 + 74.0 * scale) * sign
        tip = (self.x(frac), sign * r + blast, 0.0)
        owner, solid = self.sk.new_owner("plate", c=tip, u=(0.0, 1.0, 0.35), v=(1.0, 0.0, 0.0),
                                         n=unit((0.0, 0.35, 1.0)), hu=30.0, hv=30.0)
        self.sk.add([root, tip], rank=1, normal=(0.0, 0.0, 1.0), group=group)
        # Rungs at a fixed pitch along the mast, not four evenly spaced marks.
        n_rungs = max(3, int(abs(blast) / ANTENNA_RUNG))
        for k in range(1, n_rungs):
            t = k / float(n_rungs)
            half = 9.0 * (1.0 - 0.45 * t)
            p = (self.x(frac), sign * r + blast * t, 0.0)
            self.sk.add([(p[0] - half, p[1], 0.0), (p[0] + half, p[1], 0.0)], rank=2,
                        normal=(0.0, 0.0, 1.0), group=group)
        dr = 26.0 * scale
        u = unit((0.0, 1.0, 0.35))
        v = (1.0, 0.0, 0.0)
        dish = ring_points(tip, u, v, dr, 24)
        self.sk.add(dish + [dish[0]], rank=0, normal=unit((0.0, 0.35, 1.0)), owner=owner,
                    group=group)
        back = ring_points(add(tip, mul(u, -8.0)), u, v, dr * 0.55, 12)
        self.sk.add(back + [back[0]], rank=2, normal=mul(unit((0.0, 0.35, 1.0)), -1.0),
                    owner=owner, group=group)
        feed = add(tip, mul(u, -dr * 0.95))
        self.sk.add([feed, add(tip, mul(u, dr * 0.15))], rank=2, normal=(1.0, 0.0, 0.0),
                    owner=owner, group=group)
        for k in range(3):
            ang = TAU * k / 3.0
            self.sk.add([feed, add(tip, add(mul(v, dr * math.cos(ang)), mul(u, dr * math.sin(ang))))],
                        rank=2, normal=(0.0, 0.0, 1.0), owner=owner, group=group)

    # -- the gantry ---------------------------------------------------------

    def gantry(self, mast_length=0.0):
        r = self.truss_r
        half = self.L * 0.5
        x0 = -half + self.open_bay * self.bay_len - 26.0
        x1 = x0 + self.bay_len + 52.0
        beam = r + 166.0
        zn = r + 30.0
        zf = -r - 30.0
        base = -r - 46.0
        for xb in (x0, x1):
            for zb in (zn, zf):
                self.sk.add([(xb, base, zb), (xb, beam, zb)],
                            rank=1 if zb > 0.0 else 2, normal=(0.0, 0.0, 1.0 if zb > 0 else -1.0),
                            group="gantry")
            self.sk.add([(xb, base, zn), (xb, base, zf)], rank=2, normal=(0.0, -1.0, 0.0),
                        group="gantry")
            self.sk.add([(xb, beam, zn), (xb, beam, zf)], rank=2, normal=(0.0, 1.0, 0.0),
                        group="gantry")
        # Ties up the legs at a fixed pitch, so the legs are a ladder.
        y = base + GANTRY_TIE
        while y < beam - 4.0:
            self.sk.add([(x0, y, zn), (x1, y, zn)], rank=2, normal=(0.0, 0.0, 1.0), group="gantry")
            if int((y - base) / GANTRY_TIE) % 2 == 0:
                self.sk.add([(x0, y, zn), (x1, min(y + GANTRY_TIE, beam), zn)], rank=2,
                            normal=(0.0, 0.0, 1.0), group="gantry")
                self.sk.add([(x1, y, zn), (x0, min(y + GANTRY_TIE, beam), zn)], rank=2,
                            normal=(0.0, 0.0, 1.0), group="gantry")
            y += GANTRY_TIE
        self.sk.add([(x0, base + 10.0, zf), (x1, beam - 10.0, zf)], rank=2,
                    normal=(0.0, 0.0, -1.0), group="gantry")
        self.sk.add([(x1, base + 10.0, zf), (x0, beam - 10.0, zf)], rank=2,
                    normal=(0.0, 0.0, -1.0), group="gantry")
        self.sk.add([(x0, beam, zn), (x1, beam, zn)], rank=0, normal=(0.0, 0.0, 1.0), group="gantry")
        self.sk.add([(x0, beam, zf), (x1, beam, zf)], rank=2, normal=(0.0, 0.0, -1.0),
                    group="gantry")
        self.sk.add([(x0, beam - 17.0, zn), (x1, beam - 17.0, zn)], rank=1,
                    normal=(0.0, 0.0, 1.0), group="gantry")
        for k in range(6):
            a = (x0 + (x1 - x0) * k / 6.0, beam, zn)
            b = (x0 + (x1 - x0) * (k + 1) / 6.0, beam - 17.0, zn)
            c2 = (b[0], beam, zn)
            self.sk.add([a, b, c2], rank=2, normal=(0.0, 0.0, 1.0), group="gantry")
        for xb in (x0, x1):
            self.sk.add([(xb, beam, zn), (xb, beam + 24.0, zn)], rank=1,
                        normal=(0.0, 0.0, 1.0), group="gantry")
            self.sk.add([(xb - 7.0, beam + 24.0, zn), (xb + 7.0, beam + 24.0, zn)], rank=2,
                        normal=(0.0, 1.0, 0.0), tone=AMBER, group="gantry")
        self.sk.add([(x0, beam + 24.0, zn), (x1, beam + 24.0, zn)], rank=2,
                    normal=(0.0, 1.0, 0.0), group="gantry")
        # The mast: a lattice tower rising from the beam until it leaves the top
        # of the frame. Its height is solved against the projected frame, so the
        # crop is exact for any seed rather than tuned by hand.
        if mast_length > 0.0:
            self.mast(x0 + (x1 - x0) * 0.5, beam + 24.0, zn, mast_length)
        return beam, x0, x1, zn

    def mast(self, xc, y0, z, length):
        """A lattice tower with ties and a windlass, cropped by the frame."""
        w = 30.0
        top = y0 + length
        steps = max(6, int(length / GANTRY_TIE))
        for sx in (-1.0, 1.0):
            self.sk.add([(xc + sx * w, y0, z), (xc + sx * w * 0.55, top, z)],
                        rank=0, normal=(0.0, 0.0, 1.0), group="mast")
        for k in range(steps):
            ya = y0 + length * k / steps
            yb = y0 + length * (k + 1) / steps
            wa = w * (1.0 - 0.45 * k / steps)
            wb = w * (1.0 - 0.45 * (k + 1) / steps)
            self.sk.add([(xc - wa, ya, z), (xc + wb, yb, z)], rank=2,
                        normal=(0.0, 0.0, 1.0), group="mast")
            self.sk.add([(xc + wa, ya, z), (xc - wb, yb, z)], rank=2,
                        normal=(0.0, 0.0, 1.0), group="mast")
            if k % 2 == 0:
                self.sk.add([(xc - wa, ya, z), (xc + wa, ya, z)], rank=2,
                            normal=(0.0, 1.0, 0.0), group="mast")
        self.sk.add([(xc - w * 0.55, top, z), (xc + w * 0.55, top, z)], rank=1,
                    normal=(0.0, 1.0, 0.0), group="mast")
        self.sk.add([(xc + w * 0.55, top, z), (xc + 120.0, top - 90.0, z)], rank=2,
                    normal=(0.0, 0.0, 1.0), group="mast")
        self.sk.add([(xc, y0 + length * 0.62, z), (xc, y0 + length * 0.62 - 84.0, z)], rank=2,
                    normal=(0.0, 0.0, 1.0), dash="14 9", group="mast")
        self.sk.add([(xc - 9.0, y0 + length * 0.62 - 84.0, z),
                     (xc + 9.0, y0 + length * 0.62 - 84.0, z)], rank=2,
                    normal=(0.0, 0.0, 1.0), tone=AMBER, group="mast")

    def cable(self, a, b, sag):
        pts = []
        for k in range(7):
            t = k / 6.0
            p = add(a, mul(sub(b, a), t))
            pts.append((p[0], p[1] - sag * 4.0 * t * (1.0 - t), p[2]))
        self.sk.add(pts, rank=2, normal=(0.0, 0.0, 1.0), group="gantry")

    def suspended(self, beam, x0, x1, zn):
        r = self.truss_r
        xc = 0.5 * (x0 + x1)
        zc = zn - 16.0
        yc = -4.0
        mlen = self.bay_len * 0.78
        mr = r * 0.88
        tilt = math.radians(4.0)
        shift = mr * 0.14
        hook = (xc + 20.0, yc + mr + 40.0, zc)
        owner, solid = self.sk.new_owner(
            "plate", c=(xc, yc + shift, zc + mr * 0.0), u=rot_y((1.0, 0.0, 0.0), tilt),
            v=(0.0, 1.0, 0.0), n=(0.0, 0.0, 1.0), hu=mlen * 0.5, hv=mr * 1.6)
        self.sk.add([(hook[0], beam - 17.0, zc), hook], rank=2, normal=(0.0, 0.0, 1.0),
                    dash="18 10", group="gantry")
        self.sk.add([hook, (xc - mlen * 0.5 + 8.0, yc + mr * 0.55 + shift, zc)], rank=1,
                    normal=(0.0, 0.0, 1.0), group="hook")
        self.sk.add([hook, (xc + mlen * 0.5 - 8.0, yc + mr * 0.55 + shift, zc)], rank=1,
                    normal=(0.0, 0.0, 1.0), group="hook")
        self.sk.add([(hook[0] - 7.0, hook[1] + 5.0, zc), (hook[0], hook[1] - 5.0, zc)], rank=2,
                    normal=(0.0, 0.0, 1.0), tone=RED, group="hook")
        self.sk.add([(hook[0] + 7.0, hook[1] + 5.0, zc), (hook[0], hook[1] - 5.0, zc)], rank=2,
                    normal=(0.0, 0.0, 1.0), tone=RED, group="hook")

        def corner(sx, sy, sz):
            p = rot_y((sx * mlen * 0.5, sy * mr, sz * mr), tilt)
            return (xc + p[0], yc + p[1] + shift, zc + p[2])

        for sx in (1.0, -1.0):
            ring = [corner(sx, c[0], c[1]) for c in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0))]
            self.sk.add(ring + [ring[0]], rank=1, normal=(1.0 if sx > 0 else -1.0, 0.0, 0.0),
                        owner=owner, group="hook")
        for sy, sz in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0)):
            self.sk.add([corner(-1.0, sy, sz), corner(1.0, sy, sz)],
                        rank=1 if sz > 0.0 else 2, normal=(0.0, sy, sz), owner=owner, group="hook")
        self.sk.add([corner(-1.0, 1.0, 1.0), corner(1.0, -1.0, 1.0)], rank=2,
                    normal=(0.0, 0.0, 1.0), owner=owner, group="hook")
        self.sk.add([corner(1.0, 1.0, 1.0), corner(-1.0, -1.0, 1.0)], rank=2,
                    normal=(0.0, 0.0, 1.0), owner=owner, group="hook")
        for sx in (1.0, -1.0):
            self.sk.add([(xc + sx * mlen * 0.5, yc + shift + mr * 0.3, zc + mr),
                         (xc + sx * (mlen * 0.5 - 8.0), yc + shift - mr * 0.3, zc + mr)], rank=2,
                        normal=(0.0, 0.0, 1.0), tone=AMBER, owner=owner, group="hook")
        socket = add(rot_y((-mlen * 0.5, 0.0, 0.0), tilt), (xc, yc + shift, zc))
        self.collar(socket, (1.0, 0.0, 0.0), mr * 0.6, CYAN, group="hook")

    def details(self):
        r = self.truss_r
        half = self.L * 0.5
        for i in range(0, self.bays + 1, 2):
            xb = -half + i * self.bay_len
            for sy in (1.0, -1.0):
                p = (xb, sy * r, r)
                self.sk.add([(p[0] - 5.0, p[1], p[2] + 5.0), (p[0] + 5.0, p[1], p[2] + 5.0)],
                            rank=2, normal=(0.0, 0.0, 1.0), group="bolts")
                self.sk.add([(p[0] - 5.0, p[1] - 3.0, p[2]), (p[0] + 5.0, p[1] + 3.0, p[2])],
                            rank=2, normal=(0.0, 0.0, 1.0), group="bolts")
        for k in range(3):
            xb = half * 0.38 + k * 24.0
            self.sk.add([(xb, -r, r), (xb, -r * 1.8, r)], rank=2,
                        normal=(0.0, 0.0, 1.0), tone=AMBER if k == 1 else None, group="bolts")

    def build(self, mast_length=0.0):
        self.truss()
        self.axial_modules()
        self.details()
        spacing = self.ring_r * 1.06
        for k in range(self.ring_count):
            frac = -0.105 - (self.ring_count - 1 - k) * spacing / self.L
            self.habitat_ring(frac, self.ring_r * (1.0 - 0.04 * (self.ring_count - 1 - k)),
                              self.ring_spokes, TAU / 53.0 + k * 0.19)
        self.radial_module(-0.045, 1.0)
        self.radial_module(0.33, -1.0, 0.9)
        for frac, sign, rows, cols in ((0.235, 1.0, self.wing_rows, self.panel_cols),
                                       (0.235, -1.0, int(self.wing_rows * 0.82), self.panel_cols),
                                       (0.405, 1.0, int(self.wing_rows * 0.66), max(2, self.panel_cols - 1)),
                                       (0.405, -1.0, int(self.wing_rows * 0.5), max(2, self.panel_cols - 1))):
            state = "partial" if (frac, sign) == (0.235, -1.0) else "full"
            self.wing(frac, sign, max(4, rows), cols, self.panel_pitch, state)
        for k in range(self.radiator_count):
            self.radiator(0.098 + 0.016 * k, 1.0 if k % 2 == 0 else -1.0, math.radians(26.0 + 9.0 * k))
        self.antenna(-0.478, 1.0, 1.0)
        if self.antenna_count > 1:
            self.antenna(-0.44, 1.0, 0.72)
        self.antenna(0.468, -1.0, 0.62)
        beam, gx0, gx1, zn = self.gantry(mast_length)
        self.cable((gx1, beam + 24.0, zn), (gx1 + 74.0, self.truss_r * 1.5, 0.0), 16.0)
        self.cable((gx0, beam - 17.0, zn), (gx0 - 48.0, self.truss_r * 1.2, -8.0), 10.0)
        self.suspended(beam, gx0, gx1, zn)
        return self.sk


# --- camera fit -------------------------------------------------------------


def projected_bbox(cam, pts):
    us = []
    vs = []
    for p in pts:
        u, v = cam.project(p)
        us.append(u)
        vs.append(v)
    return min(us), min(vs), max(us), max(vs)


def fit_camera(sk, yaw, roll):
    cam = Camera(yaw, roll)
    pts = sk.points()
    x0, y0, x1, y1 = ZONE
    avail_w = (x1 - x0) - 34.0
    avail_h = (y1 - y0) - 30.0
    bb = None
    for shrink in (0.97, 0.94, 0.90, 0.86, 0.82):
        lo, hi = 400.0, 90000.0
        for _ in range(56):
            mid = 0.5 * (lo + hi)
            cam.z0 = mid
            b = projected_bbox(cam, pts)
            err = max((b[2] - b[0]) / (avail_w * shrink), (b[3] - b[1]) / (avail_h * shrink))
            if err > 1.0:
                lo = mid
            else:
                hi = mid
        cam.z0 = hi
        cam.cx = W * 0.5
        b = projected_bbox(cam, pts)
        cam.cx += W * 0.5 - 0.5 * (b[0] + b[2])
        lo2, hi2 = -20000.0, 20000.0
        for _ in range(56):
            mid = 0.5 * (lo2 + hi2)
            cam.y0 = mid
            if 0.5 * (projected_bbox(cam, pts)[1] + projected_bbox(cam, pts)[3]) > 0.5 * (y0 + y1):
                lo2 = mid
            else:
                hi2 = mid
        cam.y0 = hi2
        bb = projected_bbox(cam, pts)
        if bb[0] >= x0 and bb[1] >= y0 and bb[2] <= x1 and bb[3] <= y1:
            return cam, bb
    return cam, bb


def solve_mast(cam, st):
    """How tall the gantry's mast must be for its top to leave the frame."""
    gx = -st.L * 0.5 + st.open_bay * st.bay_len + st.bay_len * 0.5
    beam = st.truss_r + 166.0 + 24.0
    z = st.truss_r + 30.0
    lo, hi = 200.0, 6000.0
    for _ in range(48):
        mid = 0.5 * (lo + hi)
        y = cam.project((gx, beam + mid, z))[1]
        if y > CROP_TOP:
            lo = mid
        else:
            hi = mid
    return hi


# --- depth roles and ink ----------------------------------------------------


class Ink:
    """Assigns each stroke its value role from depth, and its weight from light.

    The two cut depths are ink quantiles, not fixed fractions of the bounding
    box: a third of the ink is the near role, just under half is the middle
    distance and the rest is the far field, whatever the seed's proportions
    are. The shares are therefore by construction, and the number worth reading
    is the contrast between them: three ink values, each carrying its own band
    of the drawing, never one value everywhere."""

    def __init__(self, cam, sketch):
        self.cam = cam
        samples = []
        for item in sketch.items:
            d = cam.depth(item["pts"][len(item["pts"]) // 2])
            w = sum(length(sub(b, a)) for a, b in zip(item["pts"], item["pts"][1:]))
            samples.append((d, max(1.0, w)))
        samples.sort(reverse=True)  # nearest first
        total = sum(w for _d, w in samples) or 1.0
        self.near_cut = samples[0][0]
        self.mid_cut = samples[-1][0]
        acc = 0.0
        for d, w in samples:
            acc += w
            if acc / total <= 0.30:
                self.near_cut = d
            if acc / total <= 0.78:
                self.mid_cut = d

    def role(self, p):
        d = self.cam.depth(p)
        if d >= self.near_cut:
            return "near"
        if d >= self.mid_cut:
            return "mid"
        return "far"

    def classify(self, item):
        mid = item["pts"][len(item["pts"]) // 2]
        role = self.role(mid)
        lit = dot(unit(item["n"]), unit(LIGHT)) >= LIT
        rank = item["rank"]
        if role == "far":
            tone, weight, opacity = ROLE_TONE["far"], 1, FAR_OPACITY
        elif role == "mid":
            tone = ROLE_TONE["mid"]
            weight = 2 if lit else 1
            opacity = 1.0
        else:
            tone = ROLE_TONE["near"]
            weight = 4 if (rank == 0 and lit) else (2 if lit else 1)
            opacity = 1.0
        if item["tone"]:
            tone = item["tone"]
            if role == "far":
                opacity = 0.75
        return role, tone, weight, opacity, lit


# --- occlusion clipping -----------------------------------------------------


def simplify(points2d, epsilon=0.45):
    """Ramer-Douglas-Peucker on the projected run, so a straight member costs two
    points and only a real curve costs more. The drawing is measured in screen
    units, so the tolerance is one that reads at every width."""
    if len(points2d) < 3:
        return list(range(len(points2d)))
    keep = [0, len(points2d) - 1]
    stack = [(0, len(points2d) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = points2d[a]
        bx, by = points2d[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        best, best_i = -1.0, None
        for i in range(a + 1, b):
            px, py = points2d[i]
            if norm < 1e-9:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, best_i = d, i
        if best > epsilon and best_i is not None:
            keep.append(best_i)
            stack.append((a, best_i))
            stack.append((best_i, b))
    return sorted(set(keep))


def boundary(a, b, occ, owner, eye, cam, visible_at_a):
    """Bisect the visibility change so a stroke ends on the occluding edge."""
    lo, hi = 0.0, 1.0
    for _ in range(6):
        mid = 0.5 * (lo + hi)
        p = lerp(a, b, mid)
        if occ.hides(p, cam.project(p), owner, eye) == (not visible_at_a):
            hi = mid
        else:
            lo = mid
    # Stop on the visible side of the change: a stroke that ends a twentieth of
    # a unit short of the occluding edge reads as terminated by it, and one that
    # ends inside reads as drawn through.
    return lerp(a, b, lo)


def occlude(cam, sketch, step=2.5):
    """Cut every stroke where a nearer solid covers it. Returns the report."""
    occ = Occluders(cam)
    for solid in sketch.solids:
        occ.add(solid)
    eye = cam.eye()
    kept = []
    report = {"strokes": len(sketch.items), "samples": 0, "hidden": 0,
              "segments": 0, "clipped": 0, "ink_all": 0.0, "ink_kept": 0.0}
    for item in sketch.items:
        pts = item["pts"]
        dense = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            sa = cam.project(a)
            sb = cam.project(b)
            n = max(1, int(math.ceil(math.hypot(sb[0] - sa[0], sb[1] - sa[1]) / step)))
            for k in range(1, n + 1):
                dense.append(lerp(a, b, k / float(n)))
        if item["closed"] and dense[0] != dense[-1]:
            dense.append(dense[0])
        visible = []
        total = 0.0
        for p in dense:
            screen = cam.project(p)
            total += 1.0
            report["samples"] += 1
            if occ.hides(p, screen, item["owner"], eye):
                report["hidden"] += 1
                visible.append(False)
            else:
                visible.append(True)
        runs = []
        cur = []
        for i, (p, vis) in enumerate(zip(dense, visible)):
            if vis:
                cur.append(p)
            else:
                if cur and i > 0:
                    cur.append(boundary(dense[i - 1], p, occ, item["owner"], eye, cam, True))
                if len(cur) >= 2:
                    runs.append(cur)
                cur = []
        if cur:
            runs.append(cur)
        trimmed = []
        for run in runs:
            if len(run) < 2:
                continue
            pts2 = [cam.project(p) for p in run]
            keep = simplify(pts2)
            trimmed.append([run[k] for k in keep])
        runs = trimmed
        if len(runs) != 1 or len(runs[0]) != len(dense):
            report["clipped"] += 1
        seg_len = sum(length(sub(b, a)) for a, b in zip(dense, dense[1:]))
        if runs:
            report["segments"] += len(runs)
            report["ink_all"] += seg_len
            report["ink_kept"] += sum(sum(length(sub(b, a)) for a, b in zip(r, r[1:])) for r in runs)
            for run in runs:
                kept.append({"item": item, "pts": run})
    return kept, report


# --- render -----------------------------------------------------------------


def describe(st):
    rings = {1: "one habitat ring", 2: "two habitat rings", 3: "three habitat rings"}[st.ring_count]
    return ("Space station, technical elevation: %d-bay truss spine with %s, four solar wings, "
            "one array part-deployed, a gantry straddling open bay %d with a truss section on the "
            "hook, radiators, docking collars and antennae." % (st.bays, rings, st.open_bay))


def render(st, cam, seed, kept, ink):
    groups = {}
    for run in kept:
        item = run["item"]
        role, tone, weight, opacity, lit = ink.classify(item)
        key = (item["group"], tone, weight, round(opacity, 2), item["dash"], lit)
        groups.setdefault(key, []).append(run["pts"])
    order = []
    for group in ("body", "rungs", "bolts", "rings", "seams", "wings", "radiators", "modules",
                  "masts", "gantry", "mast", "hook"):
        order.extend(sorted(k for k in groups if k[0] == group))
    body = []
    by_group = {}
    for key in order:
        by_group.setdefault(key[0], []).append(key)
    for gid, keys in by_group.items():
        body.append('    <g id="%s">' % gid)
        for key in keys:
            tone, weight, opacity, dash, lit = key[1], key[2], key[3], key[4], key[5]
            parts = []
            for pts in groups[key]:
                coords = [fmt(cam.project(p)[0]) + " " + fmt(cam.project(p)[1]) for p in pts]
                parts.append("M" + coords[0] + "L" + " ".join(coords[1:]))
            attr = ' stroke="%s" stroke-width="%d"' % (tone, weight)
            if opacity < 0.999:
                attr += ' stroke-opacity="%.2f"' % opacity
            if dash:
                attr += ' stroke-dasharray="%s"' % dash
            body.append('      <path data-lit="%d"%s d="%s"/>'
                        % (1 if lit else 0, attr, "".join(parts)))
        body.append('    </g>')
    head = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1500" role="img" '
        'aria-labelledby="station-title station-desc">',
        '  <title id="station-title">%s</title>' % describe(st),
        '  <desc id="station-desc">Seed %d of the parametric station layer: %d truss bays of %d units, '
        '%d habitat ring%s of %.0f units, four solar wings on a %.0f-unit panel pitch with one array '
        'part-deployed, a gantry over open bay %d, lit from the upper left.</desc>' % (
            seed, st.bays, int(st.bay_len), st.ring_count, "" if st.ring_count == 1 else "s",
            st.ring_r, st.panel_pitch, st.open_bay),
        '  <g fill="none" stroke-linecap="round" stroke-linejoin="round">',
    ]
    tail = ["  </g>", "</svg>", ""]
    return "\n".join(head + ["    " + line for line in body] + tail)


def check(path, expected):
    root = ET.parse(path).getroot()
    problems = []
    if root.get("viewBox") != "0 0 2400 1500":
        problems.append("viewBox is %r" % root.get("viewBox"))
    if root.get("width") or root.get("height"):
        problems.append("root carries width/height")
    title = root.find(SVG_NS + "title")
    if title is None or not (title.text or "").strip():
        problems.append("no title")
    if root.get("role") != "img":
        problems.append("no role=img")
    tones = set(TONE_ORDER)
    weights = set()
    strokes = 0
    for node in root.iter():
        for key in ("fill", "stroke"):
            v = node.get(key)
            if v and v not in tones and v != "none":
                problems.append("colour %r" % v)
        if node.get("stroke-width"):
            weights.add(int(node.get("stroke-width")))
        for attr in ("filter", "xlink:href", "href"):
            if node.get(attr):
                problems.append("%s used" % attr)
        d = node.get("d")
        if d:
            strokes += d.count("M")
    bad = weights - {1, 2, 4}
    if bad:
        problems.append("weights %r" % sorted(bad))
    size = len(open(path, "rb").read())
    if size > 150 * 1024:
        problems.append("size %d over 150 KB" % size)
    if open(path, encoding="utf-8").read() != expected:
        problems.append("not byte-identical to a fresh render")
    return problems, size, strokes


def build_scene(seed, bias=BIAS_X):
    """Everything main() needs, in the order it needs it: the station, the fitted
    camera (biased off the centre line), the solved mast, the occlusion-clipped
    runs and the ink assignment. The occlusion checker rebuilds the same thing,
    so a measurement and a render can never disagree about the geometry."""
    st = Station(Rng(seed))
    sk = st.build()
    cam, bb = fit_camera(sk, st.yaw, st.roll)
    cam.cx += bias
    mast = solve_mast(cam, st)
    st.sk = Sketch()
    sk = st.build(mast)
    ink = Ink(cam, sk)
    kept, occ = occlude(cam, sk)
    return st, sk, cam, bb, mast, ink, kept, occ


def main(argv=None):
    ap = argparse.ArgumentParser(description="Parametric station layer for the shared scene.")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--params", action="store_true")
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args(argv)

    # The composition is deliberately off-axis: the station sits BIAS_X right of
    # the middle, so the frame's left third is open sky and the gantry's mast has
    # room to leave the top instead of standing on the centre line.
    st, sk, cam, bb, mast, ink, kept, occ = build_scene(args.seed)
    svg = render(st, cam, args.seed, kept, ink)

    report = {
        "seed": args.seed,
        "solid_count": len(sk.solids),
        "strokes_in": occ["strokes"],
        "strokes_out": len(kept),
        "samples": occ["samples"],
        "samples_hidden": occ["hidden"],
        "clipped_strokes": occ["clipped"],
        "ink_visible": round(occ["ink_kept"], 1),
        "ink_hidden": round(occ["ink_all"] - occ["ink_kept"], 1),
        "hidden_fraction": round((occ["ink_all"] - occ["ink_kept"]) / max(1e-6, occ["ink_all"]), 3),
        "mast_height": round(mast, 1),
        "bbox": [round(v, 1) for v in bb],
        "detail": {
            "rungs": sum(1 for i in sk.items if i["group"] == "rungs"),
            "ring_seams": sum(1 for i in sk.items if i["group"] == "seams"),
            "collar_bolts": sum(1 for i in sk.items if i["group"] == "modules"),
            "gantry_ties": sum(1 for i in sk.items if i["group"] == "gantry" and i["rank"] == 2),
            "mast_lattice": sum(1 for i in sk.items if i["group"] == "mast"),
            "bolts": sum(1 for i in sk.items if i["group"] == "bolts"),
        },
        "pitches": {
            "truss_rung": round(st.bay_len * RUNG_FRACTION, 1),
            "gantry_tie": GANTRY_TIE,
            "antenna_rung": ANTENNA_RUNG,
            "collar_bolt": COLLAR_BOLTS,
            "ring_seam_deg": 360.0 / RING_SEAMS,
            "panel_pitch": st.panel_pitch,
        },
    }

    if args.report:
        sys.stdout.write(json.dumps(report, indent=1) + "\n")
        return 0

    if args.params:
        sys.stdout.write(
            "seed %d | bays %d | bay_len %d | truss_r %d | rings %d r %d spokes %d | wing_rows %d "
            "| cols %d | pitch %d | module_len %d | module_r %d | yaw %.1f | roll %.1f | open_bay %d "
            "| strokes %d | hidden %.1f%% | bbox %.0f %.0f %.0f %.0f | bytes %d\n" % (
                args.seed, st.bays, int(st.bay_len), int(st.truss_r), st.ring_count, int(st.ring_r),
                st.ring_spokes, st.wing_rows, st.panel_cols, int(st.panel_pitch),
                int(st.module_len), int(st.module_r), math.degrees(st.yaw), math.degrees(st.roll),
                st.open_bay, len(kept), report["hidden_fraction"] * 100, bb[0], bb[1], bb[2], bb[3],
                len(svg.encode("utf-8"))))

    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(svg)
    else:
        sys.stdout.write(svg)

    if args.check:
        problems, size, strokes = check(args.out, svg)
        for p in problems:
            sys.stdout.write("FAIL %s\n" % p)
        if not problems:
            sys.stdout.write("OK %d bytes, %d strokes, bbox %.0f %.0f %.0f %.0f\n"
                             % (size, strokes, bb[0], bb[1], bb[2], bb[3]))
        return 1 if problems else 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
