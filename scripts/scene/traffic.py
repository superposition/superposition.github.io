#!/usr/bin/env python3
"""Generate assets/scene/traffic.svg: the orbital traffic layer of the station scene.

Canvas 0 0 2400 1500, transparent, two groups so the compositor can sandwich the
station and the city between them:

    <g id="traffic-back">   far sky    y 120-900: small craft, dense dotted trails
    <g id="traffic-front">  near sky   y 1080-1500: large craft, dashed trails, cropped

Primitive set (parameters in docs/scene.md):

  orbit      an arc drawn through three points, or a closed loop. The three points
             are squashed by an axis ratio, a circle is fitted through them, and the
             result is squashed back into an ellipse, so a path can be placed where
             it reads instead of where an ellipse happens to fall. The path is drawn
             as a dotted or dashed trail in dust, and craft ride the same curve,
             rolled to its tangent: a constellation is one path with bodies on it.
  inspector  a square bus with two booms; the cheapest craft, 9-14 px wide
  relay      a pair of diamonds on a link with a cyan sync tick; travels in fours
  bus        a hull polygon carrying two solar arrays; one family from 44 px in the
             background to the 980 px crop in the foreground
  tether     two bodies on one long line, tilted as a single object
  plume      amber engine cone, close craft only
  alert      one red reticle: ring, needle, drift ticks

Seeded, stdlib only, byte-identical on a re-run with the same seed.

    python scripts/scene/traffic.py --seed 1977 --out assets/scene/traffic.svg
"""

import argparse
import math
import random
from pathlib import Path

W, H = 2400, 1500
AMBER = "#ffc24a"
CYAN = "#8fd3ff"
CREAM = "#efe6d3"
DUST = "#a79085"
ALERT = "#e2402f"
GROUND = "#000000"

DEFAULT_SEED = 1977

# Sky: name, family, shape, craft count, size range.
#   ("arc", p0, p1, p2, axis)   an orbit through three canvas points
#   ("loop", centre, radii, rotation)  a closed ring
# The points are the design: the left and right thirds carry the visible traffic,
# the middle is crossed only by arcs that the station should occlude.
SKY = [
    ("dome",       "inspector", ("arc", (0, 470), (1150, 300), (2400, 500), 1.0), 5, (4.5, 7.0)),
    ("crest",      "inspector", ("arc", (-60, 265), (760, 180), (1580, 265), 1.1), 4, (4.0, 6.0)),
    ("west-ring",  "relay",     ("loop", (270, 300), (255, 105), -14), 3, (8, 11)),
    ("east-lobe",  "relay",     ("loop", (2090, 350), (545, 200), 16), 4, (9, 12)),
    ("west-steep", "bus",       ("arc", (230, 120), (560, 340), (640, 860), 1.0), 3, (42, 64)),
    ("floor",      "inspector", ("arc", (-120, 500), (1200, 730), (2520, 540), 1.15), 4, (5.0, 7.0)),
]
GHOSTS = [
    ("gap",        ("arc", (600, 900), (1200, 820), (1860, 950), 1.2), 0.20, 2),
    ("east-steep", ("arc", (2560, 180), (2270, 520), (1990, 980), 1.0), 0.22, 2),
]
TRANSIT = ("transit", "bus", ("arc", (2520, 300), (1450, 560), (280, 1010), 1.25), 2, (46, 64))
FG_BOWL = ("arc", (-140, 1260), (1150, 1430), (2570, 1160), 1.0)
FG_TETHER = ("arc", (1760, 1200), (2060, 1140), (2400, 1225), 1.0)


def n(v):
    """Compact, deterministic number formatting."""
    r = round(float(v), 2)
    if abs(r) < 1e-9:
        return "0"
    if abs(r - round(r)) < 1e-9:
        return str(int(round(r)))
    return ("%.2f" % r).rstrip("0").rstrip(".")


class Orbit(object):
    """An ellipse by centre, radii and x-axis rotation, with point and tangent."""

    def __init__(self, cx, cy, rx, ry, rot):
        self.cx, self.cy = cx, cy
        self.rx, self.ry, self.rot = rx, ry, rot
        self._c = math.cos(math.radians(rot))
        self._s = math.sin(math.radians(rot))

    def point(self, deg):
        t = math.radians(deg)
        x, y = self.rx * math.cos(t), self.ry * math.sin(t)
        return (self.cx + x * self._c - y * self._s,
                self.cy + x * self._s + y * self._c)

    def angle_of(self, x, y):
        """The parametric angle of a canvas point on this ellipse."""
        dx, dy = x - self.cx, y - self.cy
        u = dx * self._c + dy * self._s
        v = -dx * self._s + dy * self._c
        return math.degrees(math.atan2(v / self.ry, u / self.rx))

    def tangent(self, deg):
        t = math.radians(deg)
        dx, dy = -self.rx * math.sin(t), self.ry * math.cos(t)
        return math.degrees(math.atan2(dx * self._s + dy * self._c,
                                       dx * self._c - dy * self._s))

    def path(self, d0, d1, step=140.0):
        """The arc as SVG A commands, never longer than a half ellipse each."""
        parts, a = [], float(d0)
        while abs(d1 - a) > 1e-6:
            b = a + min(step, abs(d1 - a)) * (1.0 if d1 > a else -1.0)
            x0, y0 = self.point(a)
            x1, y1 = self.point(b)
            parts.append("M%s %sA%s %s %s 0 %d %s %s" % (
                n(x0), n(y0), n(self.rx), n(self.ry), n(self.rot),
                1 if b > a else 0, n(x1), n(y1)))
            a = b
        return "".join(parts)


def ellipse_through(p0, p1, p2, axis=1.0):
    """An ellipse whose arc passes through three canvas points.

    Squash the points by the axis ratio, fit the circle through them, squash the
    circle back: the result is an ellipse with rx = R and ry = R * axis whose
    parametric angles at the three points are known exactly.
    """
    (ax, ay), (bx, by), (cx, cy) = [(p[0], p[1] / axis) for p in (p0, p1, p2)]
    d = 2.0 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-6:
        raise ValueError("three collinear points do not define an orbit")
    a2, b2, c2 = ax * ax + ay * ay, bx * bx + by * by, cx * cx + cy * cy
    ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d
    uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d
    r = math.hypot(ax - ux, ay - uy)
    return Orbit(ux, uy * axis, r, r * axis, 0.0)


def span_of(orbit, p0, p1, p2):
    """The signed parametric span from p0 to p2 that passes through p1."""
    t0, t1, t2 = [orbit.angle_of(p[0], p[1]) for p in (p0, p1, p2)]

    def fwd(a, b):
        return (b - a) % 360.0

    if fwd(t0, t1) < fwd(t0, t2):
        return t0, t0 + fwd(t0, t2)
    return t0, t0 - (360.0 - fwd(t0, t2))


def shape_orbit(shape, rng):
    """Resolve a shape template into an orbit and the span to draw."""
    if shape[0] == "arc":
        pts = [(x + rng.uniform(-14, 14), y + rng.uniform(-12, 12)) for x, y in shape[1:4]]
        axis = shape[4] * rng.uniform(0.94, 1.06)
        orbit = ellipse_through(pts[0], pts[1], pts[2], axis)
        d0, d1 = span_of(orbit, *pts)
        if abs(d1 - d0) < 0.2:
            raise ValueError("degenerate orbit")
        return orbit, d0, d1
    (cx, cy), (rx, ry), rot = shape[1], shape[2], shape[3]
    orbit = Orbit(cx + rng.uniform(-10, 10), cy + rng.uniform(-10, 10),
                  rx * rng.uniform(0.92, 1.08), ry * rng.uniform(0.92, 1.08),
                  rot + rng.uniform(-6, 6))
    d0 = rng.uniform(0, 360)
    return orbit, d0, d0 + 360 * rng.uniform(0.88, 0.98)


def extent(orbit, d0, d1, steps=24):
    xs, ys = [], []
    for i in range(steps + 1):
        x, y = orbit.point(d0 + (d1 - d0) * i / steps)
        xs.append(x)
        ys.append(y)
    return min(xs), max(xs), min(ys), max(ys)


def fit_band(orbit, d0, d1, lo=126, hi=1490, steps=90):
    """The longest contiguous span of an arc that stays inside the frame band.

    A loop's rotation and radius jitter can push it past the top edge on an
    unlucky seed, so the span is trimmed to the part that belongs in the layer
    instead of hand-tuning every template to survive every seed.
    """
    best, best_len, start = (d0, d1), 0.0, None
    for i in range(steps + 1):
        t = d0 + (d1 - d0) * i / steps
        if lo <= orbit.point(t)[1] <= hi:
            if start is None:
                start = t
            if abs(t - start) > best_len:
                best_len, best = abs(t - start), (start, t)
        else:
            start = None
    return best


def trail(orbit, d0, d1, on, off, weight, opacity):
    return ('<path d="%s" stroke="%s" stroke-width="%d" stroke-dasharray="%s %s" '
            'stroke-opacity="%s"/>' % (orbit.path(d0, d1), DUST, weight,
                                       n(on), n(off), n(opacity)))


def gc(body, x, y, ang):
    return '<g transform="translate(%s %s) rotate(%s)">%s</g>' % (n(x), n(y), n(ang), body)


def poly(points, fill="none", sw=2, stroke=CREAM):
    d = "M" + " L".join("%s %s" % (n(px), n(py)) for px, py in points) + "Z"
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%d"/>' % (d, fill, stroke, sw)


# --- craft families -------------------------------------------------------
# Each returns local-frame geometry; gc() places and rolls it.


def inspector(s):
    """A square bus with two booms. Solid once it is only a few pixels wide."""
    if s <= 6.5:
        return ('<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>'
                '<path d="M%s 0H%sM%s 0H%s" stroke="%s" stroke-width="1"/>' % (
                    n(-s), n(-s * 0.68), n(2 * s), n(1.36 * s), CREAM,
                    n(-2.6 * s), n(-1.6 * s), n(1.6 * s), n(2.6 * s), CREAM))
    return ('<rect x="%s" y="%s" width="%s" height="%s" fill="none" stroke="%s" stroke-width="2"/>'
            '<path d="M%s 0H%sM%s 0H%sM0 %sV%sM0 %sV%s" stroke="%s" stroke-width="1"/>' % (
                n(-s), n(-s), n(2 * s), n(2 * s), CREAM,
                n(-2.4 * s), n(-1.4 * s), n(1.4 * s), n(2.4 * s),
                n(-2.4 * s), n(-1.4 * s), n(1.4 * s), n(2.4 * s), CREAM))


def relay(sep, s, sync=True):
    """Two diamonds on one link; the link is the tether, the tick is state."""
    body = '<path d="M%s 0H%s" stroke="%s" stroke-width="1" stroke-opacity="0.8"/>' % (
        n(-sep * 0.5), n(sep * 0.5), CREAM)
    for side in (-1, 1):
        cx = side * sep * 0.5
        body += ('<path d="M%s 0L%s %sL%s 0L%s %sZ" fill="none" stroke="%s" '
                 'stroke-width="2"/>' % (n(cx - s), n(cx), n(-s), n(cx + s), n(cx), n(s), CREAM))
    if sync:
        body += ('<path d="M%s %sH%sM%s %sH%s" stroke="%s" stroke-width="1" '
                 'stroke-opacity="0.9"/>' % (n(-s * 1.2), n(-sep * 0.5), n(s * 1.2),
                                             n(-s * 1.2), n(sep * 0.5), n(s * 1.2), CYAN))
    return body


def bus(L, hh, panel=1.5, sw=2, fill="none", cells=False):
    """Hull plus two solar arrays: the one family at every scale."""
    body = poly([(0.50 * L, 0), (0.33 * L, -0.92 * hh), (0.06 * L, -1.02 * hh),
                 (-0.34 * L, -0.86 * hh), (-0.50 * L, -0.5 * hh),
                 (-0.50 * L, 0.5 * hh), (-0.34 * L, 0.86 * hh),
                 (0.06 * L, 1.02 * hh), (0.33 * L, 0.92 * hh)], fill, sw)
    pw = panel * hh
    px0, px1 = -0.26 * L, 0.20 * L
    for side in (-1, 1):
        y0 = side * hh * 1.42
        y1 = side * (hh * 1.42 + pw)
        body += ('<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" '
                 'stroke-width="%d"/>' % (n(px0), n(min(y0, y1)), n(px1 - px0),
                                          n(pw), fill, CREAM, 2 if cells else sw))
        body += '<path d="M%s %sV%sM%s %sV%s" stroke="%s" stroke-width="1"/>' % (
            n(px0 + (px1 - px0) * 0.12), n(y0), n(side * hh),
            n(px0 + (px1 - px0) * 0.82), n(y1), n(side * hh), CREAM)
        if cells:
            for k in range(1, 6):
                bx = px0 + (px1 - px0) * k / 6.0
                body += '<path d="M%s %sV%s" stroke="%s" stroke-width="1" stroke-opacity="0.5"/>' % (
                    n(bx), n(min(y0, y1) + 4), n(max(y0, y1) - 4), CREAM)
    return body


def tether_pair(L, s):
    """Two bodies on one line: the line is heavier than either body."""
    body = '<path d="M%s 0H%s" stroke="%s" stroke-width="2" stroke-opacity="0.75"/>' % (
        n(-L * 0.5), n(L * 0.5), DUST)
    for side in (-1, 1):
        cx = side * L * 0.5
        body += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s"/>' % (
            n(cx - s * 0.55), n(-s * 0.4), n(s * 1.1), n(s * 0.8), CREAM)
        body += '<path d="M%s %sV%s" stroke="%s" stroke-width="2"/>' % (
            n(cx), n(-s * 0.4), n(-s * 2.1), CREAM)
    body += '<path d="M%s 0H%s" stroke="%s" stroke-width="1"/>' % (
        n(-L * 0.1), n(L * 0.1), CREAM)
    return body


def plume(length, width):
    """Amber engine cone, pointing down the local -x axis from the origin."""
    outer = [(0, -0.5 * width), (-0.55 * length, -0.42 * width), (-length, -0.07 * width),
             (-length, 0.07 * width), (-0.55 * length, 0.42 * width), (0, 0.5 * width)]
    body = poly(outer, AMBER, 2).replace('fill="#ffc24a"', 'fill="#ffc24a" fill-opacity="0.14"')
    body += '<path d="M-6 0H%s" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (
        n(-0.6 * length), AMBER)
    for side in (-1, 1):
        body += ('<path d="M%s %sL%s %s" stroke="%s" stroke-width="1" stroke-opacity="0.85"/>' % (
            n(-0.12 * length), n(side * width * 0.2), n(-0.9 * length),
            n(side * width * 0.44), AMBER))
    return body


def close_bus(L, hh, plume_len=520):
    """The craft the viewer is nearly inside: engine at the local origin, nose at x=L.

    Drawn in the bus frame (hull centred) and shifted so the engine sits on the
    origin, which is what the caller aims. The arrays and their cell lines come
    from bus() itself, so the crop is the same family as the 44 px craft in the sky.
    """
    body = plume(plume_len, 160)
    body += '<g transform="translate(%s 0)">' % n(0.5 * L)
    body += bus(L, hh, panel=1.7, sw=4, fill=GROUND, cells=True)
    body += '<path d="M%s %sV%sM%s %sV%s" stroke="%s" stroke-width="1" stroke-opacity="0.8"/>' % (
        n(-0.36 * L), n(-hh * 0.9), n(hh * 0.9), n(-0.06 * L), n(-hh * 0.76), n(hh * 0.76), CREAM)
    body += '<path d="M%s %sL%s %s" stroke="%s" stroke-width="2"/>' % (
        n(-0.44 * L), n(hh), n(-0.3 * L), n(hh * 1.5), CREAM)
    body += '<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" stroke-width="2"/>' % (
        n(0.1 * L), n(-hh * 1.72), n(0.1 * L), n(hh * 0.4), GROUND, CREAM)
    body += '<path d="M%s %sL%s %sM%s %sL%s %s" stroke="%s" stroke-width="2"/>' % (
        n(-0.42 * L), n(-hh * 1.02), n(-0.28 * L), n(-hh * 2.5),
        n(-0.42 * L), n(hh * 1.02), n(-0.28 * L), n(hh * 2.5), CREAM)
    body += '<circle cx="%s" cy="%s" r="7" fill="%s"/>' % (n(-0.18 * L), n(-hh * 0.48), CYAN)
    body += '<circle cx="%s" cy="%s" r="16" fill="none" stroke="%s" stroke-width="1" ' \
            'stroke-opacity="0.7"/>' % (n(-0.18 * L), n(-hh * 0.48), CYAN)
    body += '</g>'
    return body


def alert_mark():
    """The one red element: a reticle on an object leaving its trail."""
    body = '<circle cx="0" cy="0" r="26" fill="none" stroke="%s" stroke-width="2"/>' % ALERT
    body += '<path d="M0 -26V-46M0 26V46M-26 0H-46M26 0H46" stroke="%s" stroke-width="2"/>' % ALERT
    body += '<path d="M46 0H250" stroke="%s" stroke-width="2" stroke-dasharray="2 11"/>' % ALERT
    for k, dx in enumerate((110, 160, 215)):
        body += '<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (
            n(dx), n(10 + k * 9), n(2.6 - 0.4 * k), ALERT)
    return body


# --- layout ---------------------------------------------------------------


def build(seed, constellations, density, angle):
    """Place every trail and craft. Returns the two groups and a stats table."""
    rng = random.Random(seed)
    back, front, rows, far = [], [], [], []

    def craft_at(orbit, t, size):
        x, y = orbit.point(t)
        return (x, y, orbit.tangent(t), size)

    def craft_on(orbit, d0, d1, count, size, lo=130, hi=760):
        made = []
        for i in range(count):
            t = d0 + (d1 - d0) * (i + rng.uniform(0.25, 0.75)) / count
            x, y = orbit.point(t)
            if -140 < x < W + 140 and lo < y < hi:
                made.append(craft_at(orbit, t, rng.uniform(*size)))
        return made

    def draw(made, family, band):
        out = []
        if band == "sky":
            far.extend(made)
        for x, y, a, s in made:
            if family == "inspector":
                out.append(gc(inspector(s * (2.6 if band == "front" else 1.0)), x, y, a))
            elif family == "relay":
                out.append(gc(relay(s * 2.4, s * 0.52), x, y, a + 90))
            else:
                out.append(gc(bus(s, s * 0.24, panel=1.6, sw=2 if s > 60 else 1), x, y, a))
        return out

    def sky(name, family, shape, count, size, opacity):
        orbit, d0, d1 = shape_orbit(shape, rng)
        d0, d1 = fit_band(orbit, d0, d1)
        back.append(trail(orbit, d0, d1, 2, density, 1, opacity))
        made = craft_on(orbit, d0, d1, max(1, count + rng.choice((-1, 0, 0, 1))), size)
        back.extend(draw(made, family, "sky"))
        rows.append(dict(name=name, rx=orbit.rx, ry=orbit.ry, rot=orbit.rot,
                         d0=d0, d1=d1, ext=extent(orbit, d0, d1), craft=len(made),
                         live=opacity >= 0.3))

    # far sky: the constellations the seed keeps live, the rest are bare paths
    anchor = [t for t in SKY if t[0] in ("dome", "crest", "west-steep")]
    rest = [t for t in SKY if t not in anchor]
    kept = anchor + rng.sample(rest, max(1, min(len(rest), constellations - 3)))
    for t in SKY:
        if t in kept:
            sky(t[0], t[1], t[2], t[3], t[4], 0.85 if t[0] == "dome" else 0.72)
        else:
            orbit, d0, d1 = shape_orbit(t[2], rng)
            d0, d1 = fit_band(orbit, d0, d1)
            back.append(trail(orbit, d0, d1, 1, density * rng.uniform(1.1, 1.4), 1, 0.28))
            rows.append(dict(name=t[0], rx=orbit.rx, ry=orbit.ry, rot=orbit.rot,
                             d0=d0, d1=d1, ext=extent(orbit, d0, d1), craft=0, live=False))

    for name, shape, opacity, count in GHOSTS:
        orbit, d0, d1 = shape_orbit(shape, rng)
        d0, d1 = fit_band(orbit, d0, d1)
        back.append(trail(orbit, d0, d1, 1, density * 1.6, 1, opacity))
        made = craft_on(orbit, d0, d1, count, (4.2, 5.6), 130, 960)
        back.extend(draw(made, "inspector", "sky"))
        rows.append(dict(name=name, rx=orbit.rx, ry=orbit.ry, rot=orbit.rot,
                         d0=d0, d1=d1, ext=extent(orbit, d0, d1), craft=len(made),
                         live=False))

    # the long diagonal that crosses the station's airspace behind it
    sky(TRANSIT[0], TRANSIT[1], TRANSIT[2], TRANSIT[3], TRANSIT[4], 0.32)

    # near sky: a bowl across the bottom, cropped at both side edges
    bowl, b0, b1 = shape_orbit(FG_BOWL, rng)
    front.append(trail(bowl, b0, b1, 20, 36, 2, 0.65))
    on_bowl = draw(craft_on(bowl, b0, b1, 1, (58, 58), 1080, 1460), "bus", "front")
    front.extend(on_bowl)
    rows.append(dict(name="bowl", rx=bowl.rx, ry=bowl.ry, rot=bowl.rot, d0=b0, d1=b1,
                     ext=extent(bowl, b0, b1), craft=len(on_bowl), live=True))

    # the tether pair rides its own foreground path
    tpath, t0, t1 = shape_orbit(FG_TETHER, rng)
    front.append(trail(tpath, t0, t1, 1, 7, 1, 0.5))
    tx, ty, ta, _ = craft_at(tpath, t0 + (t1 - t0) * 0.45, 0)
    front.append(gc(tether_pair(rng.uniform(500, 550), 32), tx, ty, ta))
    rows.append(dict(name="tether", rx=tpath.rx, ry=tpath.ry, rot=tpath.rot, d0=t0, d1=t1,
                     ext=extent(tpath, t0, t1), craft=1, live=True))

    # a hull entering from the left edge, cropped by it
    front.append(gc(bus(390, 44, panel=1.8, sw=2), rng.uniform(-70, -30),
                    rng.uniform(1110, 1170), rng.uniform(156, 168)))

    # the close craft: engine low-centre-left, the hull and its lower array
    # cropped by the bottom edge, the amber plume streaming back up the frame
    front.append(gc(close_bus(980, 78, 520), rng.uniform(700, 780),
                    rng.uniform(1280, 1320), angle))

    # one alert: a reticle on the sky craft nearest the upper right, so the red
    # always marks a body leaving its trail and never floats over the station
    near = [c for c in far if c[0] > 1620 and 290 < c[1] < 640]
    if near:
        ax, ay = min(near, key=lambda c: math.hypot(c[0] - 2040, c[1] - 460))[:2]
        ax, ay = ax + rng.uniform(96, 128), ay - rng.uniform(66, 96)
    else:
        ax, ay = rng.uniform(1980, 2090), rng.uniform(430, 500)
    front.append(gc(alert_mark(), min(ax, 2130), max(ay, 250), rng.uniform(-16, 2)))

    return back, front, rows


def write_svg(path, seed, constellations, density, back, front, angle):
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="img" '
            'fill="none" stroke-linecap="round" stroke-linejoin="round">\n'
            '<title>Orbital traffic around the station</title>\n'
            '<!-- Generated by scripts/scene/traffic.py. seed=%d constellations=%d '
            'trail-density=%s close-angle=%s -->\n'
            % (W, H, seed, constellations, n(density), n(angle)))
    body = ('<g id="traffic-back">\n%s\n</g>\n<g id="traffic-front">\n%s\n</g>\n'
            % ("\n".join(back), "\n".join(front)))
    svg = head + body + "</svg>\n"
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(svg)
    return len(svg.encode("utf-8"))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--seed", type=int, default=DEFAULT_SEED)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent.parent
                    / "assets" / "scene" / "traffic.svg")
    ap.add_argument("--constellations", type=int, default=None,
                    help="sky constellations carrying craft; seeded 5-6 when omitted")
    ap.add_argument("--dens", type=float, default=None,
                    help="trail density: dot gap in px; seeded 4-8 when omitted")
    ap.add_argument("--angle", type=float, default=None,
                    help="roll of the close craft in degrees; seeded 19-28 when omitted")
    ap.add_argument("--stats", action="store_true", help="print the resolved parameters")
    args = ap.parse_args()

    pick = random.Random(args.seed * 7919 + 13)
    constellations = args.constellations if args.constellations is not None else pick.randint(5, 6)
    density = args.dens if args.dens is not None else round(pick.uniform(4.0, 8.0), 1)
    angle = args.angle if args.angle is not None else round(
        random.Random(args.seed * 31 + 7).uniform(19, 28), 1)

    back, front, rows = build(args.seed, constellations, density, angle)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    size = write_svg(args.out, args.seed, constellations, density, back, front, angle)
    print("%s %d bytes, seed %d, %d constellations, dot gap %s, close craft %s deg, "
          "%d back + %d front elements" % (args.out, size, args.seed, constellations,
                                           n(density), n(angle), len(back), len(front)))
    if args.stats:
        print("%-11s %-4s %6s %6s %6s %-13s %-16s %-16s %s" % (
            "trail", "live", "rx", "ry", "rot", "span", "x range", "y range", "craft"))
        for st in rows:
            e = st["ext"]
            print("%-11s %-4s %6.0f %6.0f %6.1f %5.1f..%-6.1f %6.0f..%-9.0f %5.0f..%-9.0f %d" % (
                st["name"], "yes" if st["live"] else "no", st["rx"], st["ry"], st["rot"],
                st["d0"], st["d1"], e[0], e[1], e[2], e[3], st["craft"]))


if __name__ == "__main__":
    main()
