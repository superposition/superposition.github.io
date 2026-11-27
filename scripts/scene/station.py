#!/usr/bin/env python3
"""Parametric space-station layer for the shared scene at 2400 x 1500.

    python scripts/scene/station.py --seed 3 --out assets/scene/station.svg

The station is built in its own three-dimensional frame (X along the truss
spine, Y up, Z towards the viewer), projected once through a pinhole camera
whose principal point is the scene's vanishing point on the horizon
(x 1200, y 980), then fitted into the station zone.  Every element is a
function of the parameter block in Station.__init__; the seed only chooses
values inside those ranges, so any seed draws a plausible station.

Stdlib only; the same seed writes byte-identical output.
"""

import argparse
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
DOWN = {4: 2, 2: 1, 1: 1}
TAU = 2.0 * math.pi
SVG_NS = "{http://www.w3.org/2000/svg}"


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


class Camera:
    def __init__(self, yaw, roll):
        self.yaw = yaw
        self.roll = roll
        self.y0 = 0.0
        self.z0 = 3000.0
        self.cx = W * 0.5
        self.cy = HORIZON
        self.f = FOCAL

    def project(self, p):
        c = math.cos(self.yaw)
        s = math.sin(self.yaw)
        x = p[0] * c + p[2] * s
        z = -p[0] * s + p[2] * c
        y = p[1]
        cr = math.cos(self.roll)
        sr = math.sin(self.roll)
        x, y = x * cr - y * sr, x * sr + y * cr + self.y0
        z += self.z0
        return (self.cx + self.f * x / z, self.cy - self.f * y / z)


class Sketch:
    def __init__(self):
        self.items = []

    def add(self, pts, w, tone=CREAM, closed=False, dash="", split=None):
        if len(pts) < 2:
            return
        if split is None:
            self.items.append((list(pts), w, tone, closed, dash))
            return
        runs = []
        cur = [pts[0]]
        prev = split(pts[0])
        for p in pts[1:]:
            nxt = split(p)
            if nxt != prev:
                cur.append(p)
                runs.append((cur, prev))
                cur = [p]
                prev = nxt
            else:
                cur.append(p)
        runs.append((cur, prev))
        for run, near in runs:
            if len(run) < 2:
                continue
            self.items.append((run, w if near else DOWN[w], tone if near else DUST, False, dash))

    def points(self):
        return [p for item in self.items for p in item[0]]


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

    def x(self, frac):
        return frac * self.L

    def truss(self):
        r = self.truss_r
        half = self.L * 0.5
        for sy, sz in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0)):
            hidden = sz < 0.0 or sy > 0.0
            for i in range(self.bays):
                if i == self.open_bay and sz > 0.0:
                    continue
                x0 = -half + i * self.bay_len
                self.sk.add([(x0, sy * r, sz * r), (x0 + self.bay_len, sy * r, sz * r)],
                            1 if hidden else 4, DUST if hidden else CREAM)
        for i in range(self.bays + 1):
            xb = -half + i * self.bay_len
            open_edge = i == self.open_bay or i == self.open_bay + 1
            for a, b, hidden in (
                ((xb, r, r), (xb, r, -r), True),
                ((xb, -r, -r), (xb, -r, r), False),
                ((xb, -r, -r), (xb, r, -r), True),
                ((xb, -r, r), (xb, r, r), False),
            ):
                if open_edge and not hidden:
                    self.sk.add([a, b], 2, CYAN)
                else:
                    self.sk.add([a, b], 1 if hidden else 2, DUST if hidden else CREAM)
        for i in range(self.bays):
            x0 = -half + i * self.bay_len
            x1 = x0 + self.bay_len
            for c0, c1, hidden in (
                ((r, r), (r, -r), True),
                ((-r, r), (-r, -r), False),
                ((r, r), (-r, r), False),
                ((r, -r), (-r, -r), True),
            ):
                if i == self.open_bay and c0 == (r, r) and c1 == (-r, r):
                    continue
                if i % 2:
                    a, b = (x0, c0[0], c0[1]), (x1, c1[0], c1[1])
                else:
                    a, b = (x0, c1[0], c1[1]), (x1, c0[0], c0[1])
                self.sk.add([a, b], 1 if hidden else 2, DUST if hidden else CREAM)
        for sy in (1.0, -1.0):
            for i in (self.open_bay, self.open_bay + 1):
                xb = -half + i * self.bay_len
                inward = -1.0 if i == self.open_bay else 1.0
                self.sk.add([(xb, sy * r, r), (xb + inward * self.bay_len * 0.16, sy * r, r)], 2, AMBER)
        self.open_bay_guide()

    def open_bay_guide(self):
        r = self.truss_r
        half = self.L * 0.5
        x0 = -half + self.open_bay * self.bay_len
        x1 = x0 + self.bay_len
        top = r + 150.0
        for xb in (x0 + 5.0, x1 - 5.0):
            self.sk.add([(xb, top, r + 3.0), (xb, -r, r + 3.0)], 1, CYAN, dash="16 12")

    def tube(self, p0, p1, radius, sides=8, ribs=(0.34, 0.68), cap=True, cap_tone=CREAM):
        axis = sub(p1, p0)
        u, v = basis(axis)
        r0 = ring_points(p0, u, v, radius, sides)
        r1 = ring_points(p1, u, v, radius, sides)
        for k in range(sides):
            a = TAU * k / sides
            o = add(mul(u, radius * math.cos(a)), mul(v, radius * math.sin(a)))
            near = o[2] >= 0.0
            self.sk.add([add(p0, o), add(p1, o)], 2 if near else 1, CREAM if near else DUST)
        near_z = lambda p: p[2] > p0[2]
        self.sk.add(r0 + [r0[0]], 2, split=near_z)
        self.sk.add(r1 + [r1[0]], 2, split=near_z)
        for f in ribs:
            c = add(p0, mul(axis, f))
            rp = ring_points(c, u, v, radius, sides)
            self.sk.add(rp + [rp[0]], 1, split=near_z)
        if cap:
            self.collar(p1, axis, radius * 0.62, cap_tone)

    def collar(self, centre, axis, radius, tone=CREAM):
        u, v = basis(axis)
        ring = ring_points(centre, u, v, radius, 12)
        self.sk.add(ring + [ring[0]], 2, tone)
        inner = ring_points(centre, u, v, radius * 0.62, 8)
        self.sk.add(inner + [inner[0]], 1, tone)
        for k in range(4):
            a = TAU * k / 4.0 + TAU / 8.0
            edge = (math.cos(a), math.sin(a))
            self.sk.add([add(centre, add(mul(u, radius * math.cos(a)), mul(v, radius * math.sin(a)))),
                         add(centre, add(mul(u, radius * 1.24 * edge[0]), mul(v, radius * 1.24 * edge[1])))],
                        2, tone)
        self.sk.add([add(centre, mul(u, radius * 0.30)), add(centre, mul(u, -radius * 0.30))], 1, tone)
        self.sk.add([add(centre, mul(v, radius * 0.30)), add(centre, mul(v, -radius * 0.30))], 1, tone)

    def adapter(self, centre, axis, radius):
        u, v = basis(axis)
        a = ring_points(centre, u, v, radius, 8)
        b = ring_points(add(centre, mul(axis, -14.0)), u, v, radius * 1.22, 8)
        for k in range(8):
            self.sk.add([a[k], b[k]], 1, CREAM if a[k][2] >= centre[2] else DUST)

    def axial_modules(self):
        half = self.L * 0.5
        mr = self.module_r
        self.tube((-half, 0.0, 0.0), (-half - self.module_len * 0.95, 0.0, 0.0), mr, 8)
        self.adapter((-half, 0.0, 0.0), (-1.0, 0.0, 0.0), mr)
        self.tube((half, 0.0, 0.0), (half + self.module_len * 0.8, 0.0, 0.0), mr * 0.86, 8)
        self.adapter((half, 0.0, 0.0), (1.0, 0.0, 0.0), mr)

    def radial_module(self, xf, sign, rscale=1.0):
        r = self.truss_r
        length = self.module_len * 1.15 * rscale
        radius = self.module_r * 0.92 * rscale
        p0 = (self.x(xf), sign * (r + 8.0), 0.0)
        p1 = (self.x(xf), sign * (r + 8.0) + sign * length, 0.0)
        self.tube(p0, p1, radius, 8)
        self.collar(add(p1, mul((0.0, sign, 0.0), 8.0)), (0.0, sign, 0.0), radius * 0.58, AMBER)

    def habitat_ring(self, frac, radius, spokes, phase):
        cx = self.x(frac)
        up = (0.0, 1.0, 0.0)
        fw = (0.0, 0.0, 1.0)
        rim = ring_points((cx, 0.0, 0.0), up, fw, radius, 44)
        inner = ring_points((cx, 0.0, 0.0), up, fw, radius * 0.88, 44)
        self.sk.add(rim + [rim[0]], 2, split=lambda p: p[2] > 0.0)
        self.sk.add(inner + [inner[0]], 1, split=lambda p: p[2] > 0.0)
        for k in range(spokes):
            a = phase + TAU * k / spokes
            self.sk.add([(cx, 0.0, 0.0), (cx, radius * 0.88 * math.cos(a), radius * 0.88 * math.sin(a))],
                        2, split=lambda p: p[2] > 0.0)
        for k in range(spokes * 2):
            a = phase + TAU * (k + 0.5) / (spokes * 2)
            lit = k % 2 == 0 and math.sin(a) > 0.25
            p = (cx, radius * 0.93 * math.cos(a), radius * 0.93 * math.sin(a))
            q = (cx, radius * 1.03 * math.cos(a), radius * 1.03 * math.sin(a))
            self.sk.add([p, q], 1, AMBER if lit else CREAM)
        for rad, w, tone in ((0.17, 2, CREAM), (0.10, 1, DUST)):
            hub = ring_points((cx, 0.0, 0.0), up, fw, radius * rad, 8, TAU / 16.0)
            self.sk.add(hub + [hub[0]], w, tone)

    def panel(self, centre, u, v, hu, hv, w=1, tone=CREAM, grid=0):
        self.sk.add([add(centre, add(mul(u, hu), mul(v, hv))),
                     add(centre, add(mul(u, -hu), mul(v, hv))),
                     add(centre, add(mul(u, -hu), mul(v, -hv))),
                     add(centre, add(mul(u, hu), mul(v, -hv)))], w, tone, closed=True)
        for k in range(1, grid):
            t = -1.0 + 2.0 * k / grid
            self.sk.add([add(centre, add(mul(u, hu * t), mul(v, hv))),
                         add(centre, add(mul(u, hu * t), mul(v, -hv)))], 1, tone)

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
        for edge in (-0.5, 0.5):
            self.sk.add([add(root, mul(c, edge * width)), add(front, mul(c, edge * width))], 2, CREAM)
        for i in range(full):
            for j in range(cols):
                centre = add(add(root, mul(d, pitch * 0.8 + (i + 0.5) * pitch)),
                             mul(c, (j - (cols - 1) * 0.5) * across))
                self.panel(centre, d, c, pitch * 0.44, across * 0.44, 1)
            if i % 4 == 0:
                rail = add(root, mul(d, pitch * 0.8 + (i + 0.5) * pitch))
                self.sk.add([add(rail, mul(c, width * 0.5)), add(rail, mul(c, -width * 0.5))], 2, CREAM)
        self.sk.add([add(front, mul(c, width * 0.5)), add(front, mul(c, -width * 0.5))], 2, AMBER)
        self.sk.add([add(root, mul(c, width * 0.5)), add(root, mul(c, -width * 0.5))], 2, CREAM)
        self.sk.add([root, front], 2, AMBER)
        if state != "full":
            n = unit(add(cross(d, c), d))
            for k in range(4):
                c0 = add(add(front, mul(d, pitch * (0.6 + k * 0.5))), mul(n, k * 3.0))
                self.panel(c0, d, c, pitch * 0.20, across * 0.13, 1, DUST)
            hold = add(front, mul(d, pitch * 2.4))
            self.sk.add([front, add(tip, mul(n, 10.0))], 1, DUST, dash="12 10")
            for edge in (-0.5, 0.5):
                self.sk.add([add(front, mul(c, edge * width)), add(hold, mul(c, edge * width))], 2, AMBER)
            self.sk.add([add(hold, mul(c, width * 0.5)), add(hold, mul(c, -width * 0.5))], 1, AMBER)
        self.sk.add([add(root, mul(d, -pitch * 0.5)), add(root, mul(d, -pitch * 1.6))], 2, DUST)

    def radiator(self, frac, sign, angle):
        r = self.truss_r
        root = (self.x(frac), sign * (r + 4.0), 6.0)
        d = unit((math.sin(angle) * 0.35, sign * math.cos(angle) * 0.9, 0.45))
        c = unit((1.0, 0.0, -0.2))
        c = unit(sub(c, mul(d, dot(c, d))))
        ln = self.module_len * 1.45
        wd = self.truss_r * 1.5
        centre = add(root, mul(d, ln * 0.5))
        self.panel(centre, d, c, ln * 0.5, wd * 0.5, 2, CREAM)
        for k in range(1, 7):
            t = -1.0 + 2.0 * k / 7.0
            self.sk.add([add(centre, add(mul(d, ln * 0.5 * t), mul(c, wd * 0.5))),
                         add(centre, add(mul(d, ln * 0.5 * t), mul(c, -wd * 0.5)))], 1, CREAM)
        self.sk.add([root, add(root, mul(d, ln))], 1, DUST)
        hinge = ring_points(root, (0.0, 1.0, 0.0), (0.0, 0.0, 1.0), 7.0, 8)
        self.sk.add(hinge + [hinge[0]], 1, CREAM)

    def antenna(self, frac, sign, scale=1.0):
        r = self.truss_r
        root = (self.x(frac), sign * r, 0.0)
        blast = (58.0 + 74.0 * scale) * sign
        tip = (self.x(frac), sign * r + blast, 0.0)
        self.sk.add([root, tip], 1, CREAM)
        for k in range(1, 5):
            t = k / 5.0
            half = 9.0 * (1.0 - 0.45 * t)
            p = (self.x(frac), sign * r + blast * t, 0.0)
            self.sk.add([(p[0] - half, p[1], 0.0), (p[0] + half, p[1], 0.0)], 1, DUST)
        dr = 26.0 * scale
        u = unit((0.0, 1.0, 0.35))
        v = (1.0, 0.0, 0.0)
        dish = ring_points(tip, u, v, dr, 16)
        self.sk.add(dish + [dish[0]], 2, CREAM)
        back = ring_points(add(tip, mul(u, -8.0)), u, v, dr * 0.55, 12)
        self.sk.add(back + [back[0]], 1, DUST)
        feed = add(tip, mul(u, -dr * 0.95))
        self.sk.add([feed, add(tip, mul(u, dr * 0.15))], 1, CREAM)
        for k in range(3):
            a = TAU * k / 3.0
            self.sk.add([feed, add(tip, add(mul(v, dr * math.cos(a)), mul(u, dr * math.sin(a))))], 1, DUST)

    def gantry(self):
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
                self.sk.add([(xb, base, zb), (xb, beam, zb)], 2 if zb > 0.0 else 1,
                            CREAM if zb > 0.0 else DUST)
            self.sk.add([(xb, base, zn), (xb, base, zf)], 1, DUST)
            self.sk.add([(xb, beam, zn), (xb, beam, zf)], 1, DUST)
        for k in range(1, 4):
            y = base + (beam - base) * k / 4.0
            self.sk.add([(x0, y, zn), (x1, y, zn)], 1, CREAM)
        self.sk.add([(x0, base + 10.0, zn), (x1, beam - 10.0, zn)], 1, CREAM)
        self.sk.add([(x1, base + 10.0, zn), (x0, beam - 10.0, zn)], 1, CREAM)
        self.sk.add([(x0, base + 10.0, zf), (x1, beam - 10.0, zf)], 1, DUST)
        self.sk.add([(x1, base + 10.0, zf), (x0, beam - 10.0, zf)], 1, DUST)
        self.sk.add([(x0, beam, zn), (x1, beam, zn)], 2, CREAM)
        self.sk.add([(x0, beam, zf), (x1, beam, zf)], 1, DUST)
        self.sk.add([(x0, beam - 17.0, zn), (x1, beam - 17.0, zn)], 1, CREAM)
        for k in range(6):
            a = (x0 + (x1 - x0) * k / 6.0, beam, zn)
            b = (x0 + (x1 - x0) * (k + 1) / 6.0, beam - 17.0, zn)
            c = (b[0], beam, zn)
            self.sk.add([a, b, c], 1, CREAM)
        for xb in (x0, x1):
            self.sk.add([(xb, beam, zn), (xb, beam + 24.0, zn)], 2, CREAM)
            self.sk.add([(xb - 7.0, beam + 24.0, zn), (xb + 7.0, beam + 24.0, zn)], 2, AMBER)
        self.sk.add([(x0, beam + 24.0, zn), (x1, beam + 24.0, zn)], 1, DUST)
        return beam, x0, x1, zn

    def cable(self, a, b, sag):
        pts = []
        for k in range(7):
            t = k / 6.0
            p = add(a, mul(sub(b, a), t))
            pts.append((p[0], p[1] - sag * 4.0 * t * (1.0 - t), p[2]))
        self.sk.add(pts, 1, DUST)

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
        self.sk.add([(hook[0], beam - 17.0, zc), hook], 1, DUST, dash="18 10")
        self.sk.add([hook, (xc - mlen * 0.5 + 8.0, yc + mr * 0.55 + shift, zc)], 1, CREAM)
        self.sk.add([hook, (xc + mlen * 0.5 - 8.0, yc + mr * 0.55 + shift, zc)], 1, CREAM)
        self.sk.add([(hook[0] - 7.0, hook[1] + 5.0, zc), (hook[0], hook[1] - 5.0, zc)], 2, RED)
        self.sk.add([(hook[0] + 7.0, hook[1] + 5.0, zc), (hook[0], hook[1] - 5.0, zc)], 2, RED)

        def corner(sx, sy, sz):
            p = rot_y((sx * mlen * 0.5, sy * mr, sz * mr), tilt)
            return (xc + p[0], yc + p[1] + shift, zc + p[2])

        for sx in (1.0, -1.0):
            ring = [corner(sx, c[0], c[1]) for c in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0))]
            self.sk.add(ring + [ring[0]], 1, DUST if sx > 0.0 else CREAM)
        for sy, sz in ((1.0, 1.0), (1.0, -1.0), (-1.0, -1.0), (-1.0, 1.0)):
            near = sz > 0.0 or sy < 0.0
            self.sk.add([corner(-1.0, sy, sz), corner(1.0, sy, sz)], 2 if near else 1,
                        CREAM if near else DUST)
        self.sk.add([corner(-1.0, 1.0, 1.0), corner(1.0, -1.0, 1.0)], 1, CREAM)
        self.sk.add([corner(1.0, 1.0, 1.0), corner(-1.0, -1.0, 1.0)], 1, CREAM)
        for sx in (1.0, -1.0):
            self.sk.add([(xc + sx * mlen * 0.5, yc + shift + mr * 0.3, zc + mr),
                         (xc + sx * (mlen * 0.5 - 8.0), yc + shift - mr * 0.3, zc + mr)], 2, AMBER)
        socket = add(rot_y((-mlen * 0.5, 0.0, 0.0), tilt), (xc, yc + shift, zc))
        self.collar(socket, (1.0, 0.0, 0.0), mr * 0.6, CYAN)

    def details(self):
        r = self.truss_r
        half = self.L * 0.5
        for i in range(0, self.bays + 1, 2):
            xb = -half + i * self.bay_len
            for sy in (1.0, -1.0):
                p = (xb, sy * r, r)
                self.sk.add([(p[0] - 5.0, p[1], p[2] + 5.0), (p[0] + 5.0, p[1], p[2] + 5.0)], 1, DUST)
                self.sk.add([(p[0] - 5.0, p[1] - 3.0, p[2]), (p[0] + 5.0, p[1] + 3.0, p[2])], 1, DUST)
        for k in range(3):
            xb = half * 0.38 + k * 24.0
            self.sk.add([(xb, -r, r), (xb, -r * 1.8, r)], 1, AMBER if k == 1 else DUST)

    def build(self):
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
        beam, gx0, gx1, zn = self.gantry()
        self.cable((gx1, beam + 24.0, zn), (gx1 + 74.0, self.truss_r * 1.5, 0.0), 16.0)
        self.cable((gx0, beam - 17.0, zn), (gx0 - 48.0, self.truss_r * 1.2, -8.0), 10.0)
        self.suspended(beam, gx0, gx1, zn)
        return self.sk


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


def describe(st):
    rings = {1: "one habitat ring", 2: "two habitat rings", 3: "three habitat rings"}[st.ring_count]
    return ("Space station, technical elevation: %d-bay truss spine with %s, four solar wings, "
            "one array part-deployed, a gantry straddling open bay %d with a truss section on the "
            "hook, radiators, docking collars and antennae." % (st.bays, rings, st.open_bay))


def render(sk, cam, st, seed):
    groups = {}
    for pts, w, tone, closed, dash in sk.items:
        groups.setdefault((tone, w, dash), []).append((pts, closed))
    order = []
    for tone in TONE_ORDER:
        order.extend(sorted(k for k in groups if k[0] == tone))
    body = []
    for tone, w, dash in order:
        parts = []
        for pts, closed in groups[(tone, w, dash)]:
            coords = []
            for p in pts:
                u, v = cam.project(p)
                coords.append(fmt(u) + " " + fmt(v))
            parts.append("M" + coords[0] + "L" + " ".join(coords[1:]) + ("Z" if closed else ""))
        attr = ' stroke="%s" stroke-width="%d"' % (tone, w)
        if dash:
            attr += ' stroke-dasharray="%s"' % dash
        body.append("<path%s d=\"%s\"/>" % (attr, "".join(parts)))
    head = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1500" role="img" '
        'aria-labelledby="station-title station-desc">',
        '  <title id="station-title">%s</title>' % describe(st),
        '  <desc id="station-desc">Seed %d of the parametric station layer: %d truss bays of %d units, '
        '%d habitat ring%s of %.0f units, four solar wings on a %.0f-unit panel pitch with one array '
        'part-deployed, a gantry over open bay %d.</desc>' % (
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
    if size > 120 * 1024:
        problems.append("size %d over 120 KB" % size)
    if open(path, encoding="utf-8").read() != expected:
        problems.append("not byte-identical to a fresh render")
    return problems, size, strokes


def main(argv=None):
    ap = argparse.ArgumentParser(description="Parametric station layer for the shared scene.")
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--params", action="store_true")
    args = ap.parse_args(argv)

    st = Station(Rng(args.seed))
    sk = st.build()
    cam, bb = fit_camera(sk, st.yaw, st.roll)
    svg = render(sk, cam, st, args.seed)

    if args.params:
        sys.stdout.write(
            "seed %d | bays %d | bay_len %d | truss_r %d | rings %d r %d spokes %d | wing_rows %d "
            "| cols %d | pitch %d | module_len %d | module_r %d | yaw %.1f | roll %.1f | open_bay %d "
            "| strokes %d | bbox %.0f %.0f %.0f %.0f | bytes %d\n" % (
                args.seed, st.bays, int(st.bay_len), int(st.truss_r), st.ring_count, int(st.ring_r),
                st.ring_spokes, st.wing_rows, st.panel_cols, int(st.panel_pitch),
                int(st.module_len), int(st.module_r), math.degrees(st.yaw), math.degrees(st.roll),
                st.open_bay, len(sk.items), bb[0], bb[1], bb[2], bb[3], len(svg.encode("utf-8"))))

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
