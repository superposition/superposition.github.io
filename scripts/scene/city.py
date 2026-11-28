"""Generate assets/scene/city.svg: the ground, the launch yard and the city.

One-point perspective. A pinhole camera sits CAM_H world units above a ground
plane whose horizon is y=860 and whose vanishing point is x=1200, so every
edge in the drawing is a vertical, a horizontal, or a line through the point.
Depth is world units along the view axis; nearer is a larger z.

    python scripts/scene/city.py --seed 1981 --out assets/scene/city.svg

The layer is drawn for a black ground and has no background of its own: it is
line work over #000000, composited over the station and the traffic. It reads
as three values, never as hue: near masses are 4px cream outlines, the middle
distance is 2px dust, the far city is a single 1px dust line. Fills are black
and only black, used to make a nearer mass occlude what stands behind it.

Deterministic: the same seed and parameters produce identical bytes. Standard
library only.
"""

import argparse
import math
import random
from pathlib import Path

# --- tokens ---------------------------------------------------------------
AMBER = "#ffc24a"
CYAN = "#8fd3ff"
CREAM = "#efe6d3"
DUST = "#a79085"
RED = "#e2402f"
GROUND = "#000000"

# The far tier is drawn at this opacity: the haze thins the city by depth. It is
# a property of the tier, not a wash over the picture, so the near tier is never
# dimmed for a far field's sake.
FAR = "0.55"

# Where the city is lit from, and how far that light reaches: windows thin out
# towards the frame's edges rather than covering it evenly.
LIT_CENTRE = 1296.0
LIT_SPREAD = 1150.0

# What a window is, by tier. Lit floors are value, not accent: the near tier's
# are cream, the middle distance's dust, the far tier's dim dust. A seeded 1 in
# 8 stays amber, so the lights in the city read as somebody's rather than as a
# pattern.
WINDOW = {"near": (CREAM, "1"), "mid": (DUST, "1"), "far": (DUST, FAR)}

# --- canvas and camera ----------------------------------------------------
W, H = 2400, 1500
HORIZON = 860.0
VPX = 1200.0
FOCAL = 900.0
CAM_H = 55.0

# The yard corridor: the city starts where |x| = CORRIDOR * z, which projects
# to a fixed offset from the vanishing point, so the middle of the frame stays
# open for the station and its camera.
CORRIDOR = 0.42
CORRIDOR_PX = FOCAL * CORRIDOR

# World sizes of the things a block is made of.
FLOOR_H = 2.6
WIN_PITCH = 1.9


def px(x, z):
    return VPX + FOCAL * x / z


def py(z):
    return HORIZON + FOCAL * CAM_H / z


# --- formatting -----------------------------------------------------------
def n(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def p(x, y):
    return f"{n(x)} {n(y)}"


# --- output accumulator ---------------------------------------------------
GROUPS = ("ground", "city-far", "city-mid", "city-near", "yard", "fore", "weather")


class Layer:
    def __init__(self):
        self.g = {k: [] for k in GROUPS}

    def add(self, group, s):
        self.g[group].append(s)


# --- primitives -----------------------------------------------------------
def dash_pattern(pitch, rng, spans=7):
    """A dash pattern whose mean gap is `pitch` - 1, jittered per block."""
    gap = max(1.0, pitch - 1.0)
    gaps = [max(1.0, gap * rng.uniform(0.55, 1.6)) for _ in range(spans)]
    k = gap * spans / sum(gaps)
    out = []
    for gt in gaps:
        out.append("1")
        out.append(n(gt * k))
    return " ".join(out)


def block(lay, group, xs0, xs1, z0, z1, top_y, rng, windows=0.0,
          detail=False, density=1.0, simple=False):
    """An extruded block: front face at z0, roof running back to z1.

    xs0/xs1 are the front face's screen x. Only the side facing the vanishing
    point is drawn, which is what makes it read as one-point perspective.
    """
    yg0, yg1 = py(z0), py(z1)
    if top_y >= yg0 - 2:
        return None
    h = (yg0 - top_y) * z0 / FOCAL
    xw0 = (xs0 - VPX) * z0 / FOCAL
    xw1 = (xs1 - VPX) * z0 / FOCAL
    bs0, bs1 = px(xw0, z1), px(xw1, z1)
    yt1 = yg1 - FOCAL * h / z1
    left = (xs0 + xs1) * 0.5 < VPX
    sxs, sw = (xs1, xw1) if left else (xs0, xw0)
    bs = px(sw, z1)

    front = f"M{p(xs0, yg0)}H{n(xs1)}V{n(top_y)}H{n(xs0)}Z"
    side = f"M{p(sxs, yg0)}L{p(bs, yg1)}V{n(yt1)}L{n(sxs)} {n(top_y)}Z"
    if simple:
        # A far block carries only what reads at one pixel: the two uprights,
        # the roof's front and back edges, and the two roof corners.
        lay.add(group, f'<path d="{front}" fill="{GROUND}"/>')
        lay.add(group, f'<path d="M{p(xs0, yg0)}V{n(top_y)}H{n(xs1)}'
                       f'V{n(yg0)}M{p(xs0, top_y)}L{p(bs0, yt1)}'
                       f'H{n(bs1)}L{n(xs1)} {n(top_y)}"/>')
        return dict(top=top_y, bottom=yg0, xs0=xs0, xs1=xs1, z0=z0, z1=z1,
                    height=h, left=left)
    lay.add(group, f'<path d="{front}{side}" fill="{GROUND}"/>')
    lay.add(group, f'<path d="M{p(bs0, yt1)}L{n(xs0)} {n(top_y)}H{n(xs1)}'
                   f'L{p(bs1, yt1)}M{p(bs, yt1)}V{n(yg1)}'
                   f'M{p(sxs, yg0)}L{p(bs, yg1)}"/>')

    if windows > 0:
        window_rows(lay, group, xs0, xs1, z0, top_y, yg0, rng, windows)
    if detail:
        roof_detail(lay, group, xs0, xs1, top_y, yt1, bs0, bs1, rng, density)
    return dict(top=top_y, bottom=yg0, xs0=xs0, xs1=xs1, z0=z0, z1=z1,
                height=h, left=left)


def window_rows(lay, group, xs0, xs1, z0, top_y, yg0, rng, dens, colour=None, opacity=None):
    """Lit floors as one dashed row per storey, in the tier's own ink value."""
    width = xs1 - xs0
    if width < 40:
        return
    floor_s = FOCAL * FLOOR_H / z0
    pitch = FOCAL * WIN_PITCH / z0
    if floor_s < 3.4 or pitch < 2.4:
        return
    inset = min(7.0, width * 0.07)
    x0, x1 = xs0 + inset, xs1 - inset
    if x1 - x0 < 8:
        return
    rows = []
    y = top_y + floor_s * (0.5 + 0.5 * rng.random())
    # A density gradient across the frame: the city is lit under the station and
    # thins towards the frame's edges, so the eye has somewhere quiet to rest
    # instead of an even field of windows. The falloff is a function of screen x
    # only, so it holds every seed and every depth row.
    cx = (xs0 + xs1) * 0.5
    edge = min(1.0, abs(cx - LIT_CENTRE) / LIT_SPREAD)
    keep = (0.24 + 0.46 * dens) * (1.0 - 0.72 * edge * edge)
    while y < yg0 - floor_s * 0.4:
        if rng.random() < keep:
            rows.append(f"M{p(x0, y)}h{n(x1 - x0)}")
        y += floor_s
    if not rows:
        return
    dash = dash_pattern(pitch, rng)
    tier = group.replace("city-", "")
    base, base_op = WINDOW.get(tier, (DUST, "1"))
    colour = colour or (AMBER if rng.random() < 0.125 else base)
    opacity = opacity or (base_op if colour != AMBER else "0.9")
    lay.add(group, f'<path d="{"".join(rows)}" stroke="{colour}" '
                   f'stroke-width="1" stroke-opacity="{opacity}" stroke-dasharray="{dash}"/>')


def roof_detail(lay, group, xs0, xs1, top_y, yt1, bs0, bs1, rng, density):
    """Parapet plus one piece of rooftop plant or aerial."""
    w = xs1 - xs0
    if w < 26 or density <= 0:
        return
    inset = min(5.0, w * 0.08)
    iy = top_y + min(4.0, (yt1 - top_y) * 0.18 + 1.5)
    parapet = (f"M{p(bs0 + inset, yt1)}L{p(xs0 + inset, iy)}"
               f"H{n(xs1 - inset)}L{p(bs1 - inset, yt1)}")
    lay.add(group, f'<path d="{parapet}" stroke-width="1"/>')

    pick = rng.random() / max(0.05, density)
    cx = xs0 + w * (0.25 + 0.5 * rng.random())
    if pick < 0.34:
        mast_h = 14 + 46 * rng.random()
        bars = 1 + int(rng.random() * 2)
        d = [f"M{p(cx, iy)}V{n(iy - mast_h)}"]
        for i in range(bars):
            by = iy - mast_h * (0.45 + 0.3 * i)
            half = 5 + 5 * rng.random()
            d.append(f"M{p(cx - half, by)}H{n(cx + half)}")
        lay.add(group, f'<path d="{"".join(d)}" stroke-width="1"/>')
    elif pick < 0.56:
        bx0 = xs0 + w * 0.18
        bx1 = xs0 + w * 0.58
        bh = 6 + 16 * rng.random()
        lay.add(group, f'<path d="M{p(bx0, iy)}H{n(bx1)}V{n(iy - bh)}'
                       f'H{n(bx0)}Z" stroke-width="1"/>')
    elif pick < 0.72:
        r = 4 + 7 * rng.random()
        lay.add(group, f'<path d="M{p(cx - r, iy - r)}A{n(r)} {n(r * 0.8)} 0 0 1 '
                       f'{n(cx + r)} {n(iy - r)}M{p(cx, iy - r)}V{n(iy)}" '
                       f'stroke-width="1"/>')
    elif pick < 0.86:
        rx = 3 + 6 * rng.random()
        ry = rx * 0.28
        lay.add(group, f'<ellipse cx="{n(cx)}" cy="{n(iy - 2 * ry)}" '
                       f'rx="{n(rx)}" ry="{n(ry)}" stroke-width="1"/>'
                       f'<path d="M{p(cx - rx, iy - 2 * ry)}V{n(iy)}'
                       f'M{p(cx + rx, iy - 2 * ry)}V{n(iy)}" stroke-width="1"/>')


def lattice_tower(lay, group, xw, z, top_y, half_w, rng, weight=2):
    """A service tower: legs, cross bracing, a deck line, a head and an aerial."""
    yg = py(z)
    xl, xr = px(xw - half_w, z), px(xw + half_w, z)
    if yg - top_y < 20:
        return
    flare = min(9.0, (xr - xl) * 0.5)
    lay.add(group, f'<path d="M{p(xl, yg)}V{n(top_y)}M{p(xr, yg)}V{n(top_y)}'
                   f'M{p(xl, yg - flare * 1.4)}L{p(xl - flare, yg)}'
                   f'M{p(xr, yg - flare * 1.4)}L{p(xr + flare, yg)}" '
                   f'stroke-width="{weight}"/>')
    bays = max(3, int((yg - top_y) / 34))
    d = []
    for i in range(bays):
        ya = yg - (yg - top_y) * i / bays
        yb = yg - (yg - top_y) * (i + 1) / bays
        d.append(f"M{p(xl, ya)}L{p(xr, yb)}M{p(xr, ya)}L{p(xl, yb)}")
        if i % 2 == 1:
            d.append(f"M{p(xl - 1, yb)}H{n(xr + 1)}")
    lay.add(group, f'<path d="{"".join(d)}" stroke-width="1"/>')
    head = 8 + 4 * rng.random()
    lay.add(group, f'<path d="M{p(xl - head, top_y)}H{n(xr + head)}'
                   f'V{n(top_y - 5)}H{n(xl - head)}Z" stroke-width="1"/>'
                   f'<path d="M{p((xl + xr) / 2, top_y - 5)}V{n(top_y - 21)}" '
                   f'stroke-width="1"/>')


def gantry_truss(lay, group, x0, x1, y_top, depth=10):
    """A horizontal truss between two towers."""
    lay.add(group, f'<path d="M{p(x0, y_top)}H{n(x1)}'
                   f'M{p(x0, y_top + depth)}H{n(x1)}" stroke-width="2"/>')
    seg = max(2, int((x1 - x0) / 26))
    d = []
    for i in range(seg):
        xa = x0 + (x1 - x0) * i / seg
        xb = x0 + (x1 - x0) * (i + 1) / seg
        d.append(f"M{p(xa, y_top + depth)}L{p(xb, y_top)}")
        d.append(f"M{p(xa, y_top)}V{n(y_top + depth)}")
    lay.add(group, f'<path d="{"".join(d)}" stroke-width="1"/>')


def flood_mast(lay, group, xw, z, top_y, lit, rng, beams=True):
    """A floodlight mast: stem, head, cans, and rays if it is lit."""
    yg = py(z)
    x = px(xw, z)
    if yg - top_y < 24:
        return
    lay.add(group, f'<path d="M{p(x, yg)}V{n(top_y)}" stroke-width="1"/>'
                   f'<path d="M{p(x - 7, yg)}L{p(x, yg - 14)}L{p(x + 7, yg)}" '
                   f'stroke-width="2"/>')
    head = 9.0
    lay.add(group, f'<path d="M{p(x - head, top_y)}H{n(x + head)}" '
                   f'stroke-width="2"/>')
    colour = AMBER if lit else DUST
    cd = []
    for i in range(4):
        cx = x - head + 2 + i * 4.5
        cd.append(f"M{p(cx, top_y)}v{n(2.5)}")
    lay.add(group, f'<path d="{"".join(cd)}" stroke="{colour}" stroke-width="2"/>')
    if not (lit and beams):
        return
    rays = []
    for i in range(3):
        dx = (-1, 0, 1)[i] * (54 + 34 * rng.random())
        dy = 130 + 110 * rng.random()
        rays.append(f"M{p(x + i * 4.5 - 4.5, top_y + 3)}L{p(x + dx, top_y - dy)}")
    lay.add(group, f'<path d="{"".join(rays)}" stroke="{AMBER}" '
                   f'stroke-width="1" stroke-opacity="0.55"/>')


def tank(lay, group, xw, z, r, h, rng):
    """A storage tank: silhouette, roof ellipse, banding."""
    yg = py(z)
    cx = px(xw, z)
    rx = FOCAL * r / z
    ry = rx * 0.22
    top = yg - FOCAL * h / z
    lay.add(group, f'<path d="M{p(cx - rx, top)}A{n(rx)} {n(ry)} 0 0 0 '
                   f'{n(cx + rx)} {n(top)}L{p(cx + rx, yg)}H{n(cx - rx)}Z" '
                   f'fill="{GROUND}"/>')
    lay.add(group, f'<path d="M{p(cx - rx, top)}V{n(yg)}M{p(cx + rx, top)}'
                   f'V{n(yg)}M{p(cx - rx, yg)}H{n(cx + rx)}'
                   f'V{n(top)}A{n(rx)} {n(ry)} 0 0 1 {n(cx - rx)} {n(top)}"/>')
    d = []
    for i in range(2):
        by = top + (yg - top) * (0.35 + 0.3 * i)
        d.append(f"M{p(cx - rx, by)}A{n(rx)} {n(ry * 0.35)} 0 0 0 {n(cx + rx)} {n(by)}")
    lay.add(group, f'<path d="{"".join(d)}" stroke-width="1"/>')


def rails(lay, group, xw, gauge, z0, z1, ties_to=430.0, tie_pitch=3.4,
          weight=2):
    """A track pair on the ground plane, ties spacing with depth."""
    for side in (-0.5, 0.5):
        x = xw + side * gauge
        lay.add(group, f'<path d="M{p(px(x, z0), py(z0))}'
                       f'L{p(px(x, z1), py(z1))}" stroke="{CREAM}" '
                       f'stroke-width="{weight}"/>')
    d = []
    z = z0
    while z < min(z1, ties_to):
        d.append(f"M{p(px(xw - gauge * 0.8, z), py(z))}"
                 f"H{n(px(xw + gauge * 0.8, z))}")
        z += tie_pitch
    if d:
        lay.add(group, f'<path d="{"".join(d)}" stroke="{DUST}" stroke-width="1"/>')


def pad(lay, group, zf, zb, half, rng):
    """The assembly hardstand: outline, joints, the pad circle, corner marks."""
    xl0, xr0 = px(-half * zf, zf), px(half * zf, zf)
    xl1, xr1 = px(-half * zb, zb), px(half * zb, zb)
    y0, y1 = py(zf), py(zb)
    lay.add(group, f'<path d="M{p(xl0, y0)}H{n(xr0)}L{p(xr1, y1)}'
                   f'H{n(xl1)}Z" stroke-width="2"/>')
    d = []
    for u in (-0.5, -0.17, 0.17, 0.5):
        d.append(f"M{p(px(u * half * zf, zf), y0)}L{p(px(u * half * zb, zb), y1)}")
    for z in (zf + (zb - zf) * 0.33, zf + (zb - zf) * 0.66):
        d.append(f"M{p(px(-half * z, z), py(z))}H{n(px(half * z, z))}")
    lay.add(group, f'<path d="{"".join(d)}" stroke="{DUST}" stroke-width="1"/>')

    zc = (zf + zb) * 0.5
    cy = py(zc)
    r = 0.19 * zc
    circle = []
    for i in range(29):
        a = 6.283185307 * i / 28
        circle.append(("M" if i == 0 else "L") +
                      p(px(r * math.cos(a), zc + r * math.sin(a)),
                        py(zc + r * math.sin(a))))
    lay.add(group, f'<path d="{"".join(circle)}" stroke="{CREAM}" stroke-width="1"/>')
    za, zb2 = zc - r * 1.35, zc + r * 1.35
    lay.add(group, f'<path d="M{p(px(-r * 1.35, zc), cy)}H{n(px(r * 1.35, zc))}'
                   f'M{p(VPX, py(zb2))}L{p(VPX, py(za))}" '
                   f'stroke="{DUST}" stroke-width="1"/>')

    ties = []
    for i in range(6):
        for j in range(4):
            tx = (-0.58 + 1.16 * i / 5) * half * zb
            tz = zf + (zb - zf) * (0.14 + 0.62 * j / 3)
            x, y = px(tx, tz), py(tz)
            ties.append("M" + p(x - 3, y) + "h6M" + p(x, y - 3) + "v6")
    lay.add(group, '<path d="' + "".join(ties) + '" stroke="' + DUST
               + '" stroke-width="1"/>')
    lay.add(group, '<path d="M' + p(xl0 + 7, y0 - 6) + "H" + n(xr0 - 7) + "L"
               + n(xr1 - 7) + " " + n(y1 + 4) + "H" + n(xl1 + 7)
               + 'Z" stroke="' + DUST + '" stroke-width="1"/>')

    tick = []
    for i in range(22):
        u = -0.96 + 1.92 * i / 21
        xx = px(u * half * zf, zf)
        tick.append(f"M{p(xx, y0)}l{n(7)} {n(-7)}")
    for i in range(4):
        for xxs in (xl0, xr0):
            tick.append("M" + p(xxs, y0 - 4 * i) + "h" + n(4 if xxs < VPX else -4))
    lay.add(group, '<path d="' + "".join(tick) + '" stroke="' + DUST + '" stroke-width="1"/>')


def blast_wall(lay, group, xw, z, half_w, run, top_y, rng):
    """A low wall in perspective: front face, one side, a top edge."""
    a0, a1 = px(xw - half_w, z), px(xw + half_w, z)
    b0, b1 = px(xw - half_w, z + run), px(xw + half_w, z + run)
    yg0, yg1 = py(z), py(z + run)
    yt1 = top_y + (yg0 - top_y) * (1 - z / (z + run))
    lay.add(group, '<path d="M' + p(a0, yg0) + "H" + n(a1) + "V" + n(top_y)
                   + "H" + n(a0) + "Z" + "M" + p(a1, yg0) + "L" + p(b1, yg1)
                   + "V" + n(yt1) + "L" + p(a1, top_y) + 'Z" fill="' + GROUND + '"/>')
    lay.add(group, '<path d="M' + p(b0, yt1) + "L" + p(a0, top_y) + "H" + n(a1)
                   + "L" + p(b1, yt1) + "M" + p(b1, yt1) + "V" + n(yg1)
                   + '"/>')


def tier_of(z):
    if z < 230:
        return "near"
    if z < 830:
        return "mid"
    return "far"


# Per tier: the block grid (width and gap in screen px), the height band in
# screen px, how much window and rooftop detail it earns, and how far from the
# vanishing point the tier is allowed to start. Near blocks are few and large
# and begin well outside the corridor, so the foreground stays open apron.
TIER = {
    "near": dict(wmin=96, wmax=176, gmin=48, gmax=120, hmin=210, hmax=330,
                 win=1.0, det=1.0, dx=640, skip=0.14),
    "mid": dict(wmin=46, wmax=110, gmin=20, gmax=58, hmin=100, hmax=200,
                win=0.85, det=0.8, dx=392, skip=0.14),
    "far": dict(wmin=24, wmax=64, gmin=12, gmax=34, hmin=12, hmax=44,
                win=0.0, det=0.0, dx=390, skip=0.18),
}


def depth_rows(rng, count, z_first=96.0, z_last=1900.0):
    """A geometric ladder of depths: even steps in screen space, not in world."""
    ratio = (z_last / z_first) ** (1.0 / max(1, count - 1))
    rows = []
    z = z_first
    for _ in range(count):
        rows.append((z, z * ratio * rng.uniform(0.76, 0.86)))
        z *= ratio
    return rows


def city_rows(lay, rng, rows, params, tally):
    towers_left = params["towers"]
    marks = []
    win_mul = params["windows"]
    hscale = params["height"]
    grid = params["grid"]
    for z0, z1 in rows:
        tier = tier_of(z0)
        cfg = TIER[tier]
        group = "city-" + tier
        for side in (-1, 1):
            edge = cfg["dx"] + rng.uniform(0, 22)
            while edge < W / 2 + 26:
                w = rng.uniform(cfg["wmin"], cfg["wmax"]) * grid
                if edge + w > W / 2 + 26:
                    w = W / 2 + 26 - edge
                a = VPX + side * edge
                xs0, xs1 = (a, a + side * w) if side > 0 else (a - w, a)
                dx = abs((xs0 + xs1) * 0.5 - VPX)
                yg = py(z0)
                hpx = rng.uniform(cfg["hmin"], cfg["hmax"]) * hscale
                if tier == "mid":
                    hpx += 110 * max(0.0, (dx - 660) / 520)
                if (tier == "near" and dx > 940 and rng.random() < 0.4):
                    hpx = yg - rng.uniform(872, 986)
                top = yg - hpx
                tower = False
                if (towers_left > 0 and tier == "mid" and 660 <= dx <= 1160
                        and rng.random() < 0.22):
                    top = rng.uniform(712, 812)
                    tower = True
                    towers_left -= 1
                if rng.random() < cfg["skip"] and not tower:
                    edge += w + rng.uniform(cfg["gmin"], cfg["gmax"]) * grid
                    continue
                det = cfg["det"] * params["density"]
                b = block(lay, group, xs0, xs1, z0, z1, top, rng,
                          windows=cfg["win"] * win_mul,
                          detail=tier != "far" and det > 0, density=det,
                          simple=tier == "far")
                tally[tier] = tally.get(tier, 0) + 1
                if not b:
                    edge += w + rng.uniform(cfg["gmin"], cfg["gmax"]) * grid
                    continue
                if tower:
                    marks.append((xs0, xs1, top, side))
                elif tier == "far" and rng.random() < 0.16 and w > 22:
                    cx = (xs0 + xs1) * 0.5
                    hh = rng.uniform(14, 44)
                    lay.add(group, '<path d="M' + p(cx, top) + "V" + n(top - hh)
                               + "M" + p(cx - 4, top - hh * 0.6) + "H" + n(cx + 4)
                               + '" stroke-width="1"/>')
                edge += w + rng.uniform(cfg["gmin"], cfg["gmax"]) * grid

    params["_towers"] = len(marks)
    for i, (xs0, xs1, top, side) in enumerate(marks):
        cx = (xs0 + xs1) * 0.5
        hh = 34 + 62 * rng.random()
        lay.add("city-mid", '<path d="M' + p(cx, top) + "V" + n(top - hh)
                   + "M" + p(cx - 7, top - hh * 0.55) + "H" + n(cx + 7)
                   + "M" + p(cx - 4, top - hh * 0.78) + "H" + n(cx + 4)
                   + '" stroke-width="1"/>')
        if i < 2:
            lay.add("city-mid", '<path d="M' + p(cx, top - hh) + "v2.5"
                       + '" stroke="' + RED + '" stroke-width="2"/>')
        elif i < 4:
            lay.add("city-mid", '<path d="M' + p(cx, top - hh) + "v2"
                       + '" stroke="' + CYAN + '" stroke-width="1"/>')


def ground_plane(lay, rng, params):
    """The horizon, the avenues running to the vanishing point, and the rungs."""
    lay.add("ground", '<path d="M0 ' + n(HORIZON) + "H" + n(W) + '"/>')
    xs = [-360, -60, 240, 560, 880, 1180, 1520, 1860, 2160, 2440]
    d = []
    for x in xs:
        d.append("M" + p(VPX, HORIZON) + "L" + p(x, H))
    lay.add("ground", '<path d="' + "".join(d) + '" stroke-opacity="0.55"/>')
    # Rungs at an even pitch in the picture, not in the world: bunched world
    # spacing turns the last few pixels above the horizon into a grey band.
    rungs = []
    y = 1488.0
    while y > 936:
        rungs.append("M0 " + n(y) + "H" + n(W))
        y -= 44.0
    lay.add("ground", '<path d="' + "".join(rungs) + '" stroke-opacity="0.5"/>')


def yard(lay, rng, params):
    zf, zb, half = 118.0, 330.0, 0.40
    yg = py(zf)

    rails(lay, "yard", -15.0, 3.2, 78.0, 700.0, ties_to=520.0)
    rails(lay, "yard", 28.0, 3.2, 78.0, 700.0, ties_to=520.0)

    pad(lay, "yard", zf, zb, half, rng)

    for xw, z, r, h in ((0.470 * 230, 230, 0.075 * 230, 0.130 * 230),
                        (0.535 * 250, 250, 0.066 * 250, 0.105 * 250),
                        (0.462 * 196, 196, 0.058 * 196, 0.082 * 196),
                        (-0.500 * 205, 205, 0.066 * 205, 0.096 * 205)):
        tank(lay, "yard", xw, z, r, h, rng)

    for side in (-1, 1):
        blast_wall(lay, "yard", side * 0.455 * 150, 150, 0.060 * 150, 42,
                   py(150) - 46, rng)

    zt = 250.0
    span = 0.25
    towers = []
    for side in (-1, 1):
        xw = side * span * zt
        lattice_tower(lay, "yard", xw, zt, 870, 0.042 * zt, rng)
        towers.append(px(xw, zt))
    gantry_truss(lay, "yard", towers[0] - 44, towers[1] + 44, 878, 12)
    cx = (towers[0] + towers[1]) * 0.5
    lay.add("yard", '<path d="M' + p(cx - 16, 882) + "H" + n(cx + 16) + "V"
               + n(898) + "H" + n(cx - 16) + 'Z" stroke-width="1"/>'
               '<path d="M' + p(cx, 898) + "V" + n(py(zt) - 44)
               + '" stroke-width="1"/>')
    lay.add("yard", '<path d="M' + p(cx - 11, py(zt) - 44) + "H" + n(cx + 11)
               + "V" + n(py(zt) - 33) + "H" + n(cx - 11) + 'Z" stroke-width="1"/>')

    zp = 430.0
    for side in (-1, 1):
        lattice_tower(lay, "yard", side * 0.25 * zp, zp, 884, 0.032 * zp, rng)

    n_flood = params["floodlights"]
    lit_left = params["lit"]
    lit_set = 0
    for i in range(n_flood):
        side = -1 if i % 2 == 0 else 1
        z = 130 + (620 - 130) * rng.random()
        xw = side * (0.44 + 0.10 * rng.random()) * z
        tall = i < 3
        top = min(py(z) - 60, rng.uniform(858, 878) if tall
                  else rng.uniform(886, 916))
        lit = lit_left > 0 and rng.random() < 0.72
        if lit:
            lit_left -= 1
            lit_set += 1
        flood_mast(lay, "yard", xw, z, top, lit, rng, beams=tall)
    params["_lit"] = lit_set


def foreground(lay, rng, params):
    d = []
    for i in range(9):
        x = 300 + 1800 * rng.random()
        y = 1390 + 105 * rng.random()
        d.append("M" + p(x, y) + "l" + n(4) + " 0M" + p(x, y - 4) + "v" + n(8))
    lay.add("fore", '<path d="' + "".join(d) + '" stroke-opacity="0.45"/>')
    edges = []
    for xw_ratio in (-0.40, 0.40):
        edges.append("M" + p(px(xw_ratio * 118, 118), py(118)) + "L"
                     + n(px(xw_ratio * 74, 74)) + " " + n(H))
    for y in (1425, 1372, 1330):
        edges.append("M" + n(px(-0.42 * 49500 / (y - 860), 49500 / (y - 860)))
                     + " " + n(y) + "H" + n(px(0.42 * 49500 / (y - 860),
                                              49500 / (y - 860))))
    lay.add("fore", '<path d="' + "".join(edges) + '" stroke="' + CREAM
               + '" stroke-opacity="0.75"/>')


def weather(lay, rng, params):
    """Seeded small marks: haze at the horizon, motes in the air, glints on slate."""
    k = params["weather"]
    haze = []
    for _ in range(int(390 * k)):
        x = rng.uniform(-20, W + 20)
        y = HORIZON + 2 + 96 * (rng.random() ** 1.7)
        haze.append("M" + n(x) + " " + n(y) + "h" + n(rng.choice((1, 1, 2, 3))))
    lay.add("weather", '<path d="' + "".join(haze) + '" stroke-opacity="0.4"/>')

    motes = []
    for _ in range(int(230 * k)):
        x = rng.uniform(-20, W + 20)
        y = 900 + 580 * (rng.random() ** 0.7)
        motes.append("M" + n(x) + " " + n(y) + "h" + n(rng.choice((1, 1, 2))))
    lay.add("weather", '<path d="' + "".join(motes) + '" stroke="' + CREAM
               + '" stroke-opacity="0.3"/>')

    glints = []
    for _ in range(int(26 * k)):
        x = VPX + 330 * (rng.random() * 2 - 1)
        y = 960 + 430 * (rng.random() ** 0.8)
        glints.append("M" + n(x) + " " + n(y) + "h1")
    lay.add("weather", '<path d="' + "".join(glints) + '" stroke="' + AMBER
               + '" stroke-opacity="0.65"/>')


GROUP_ATTRS = {
    "ground": 'fill="none" stroke="' + DUST + '" stroke-width="1"',
    "city-far": 'fill="none" stroke="' + DUST + '" stroke-width="1" stroke-opacity="' + FAR + '"',
    "city-mid": 'fill="none" stroke="' + DUST + '" stroke-width="2"',
    "city-near": 'fill="none" stroke="' + CREAM + '" stroke-width="2"',
    "yard": 'fill="none" stroke="' + CREAM + '" stroke-width="2"',
    "fore": 'fill="none" stroke="' + CREAM + '" stroke-width="4"',
    "weather": 'fill="none" stroke="' + DUST + '" stroke-width="1"',
}


def build(seed, params):
    rng = random.Random(seed)
    lay = Layer()
    ground_plane(lay, rng, params)
    tally = {}
    city_rows(lay, rng, depth_rows(rng, params["rows"]), params, tally)
    params["_tally"] = tally
    yard(lay, rng, params)
    foreground(lay, rng, params)
    weather(lay, rng, params)

    head = ("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 "
            + str(W) + " " + str(H)
            + "\" role=\"img\" aria-labelledby=\"city-title\">\n"
            + "<title id=\"city-title\">The city and the launch yard beneath "
            "the station</title>\n"
            + "<!-- Generated by scripts/scene/city.py, seed " + str(seed) + ": "
            + str(params.get("_towers", 0)) + " landmark towers, "
            + str(params["rows"]) + " depth rows of city at grid "
            + n(params["grid"]) + ", window density " + n(params["windows"])
            + ", " + str(params["floodlights"]) + " floodlights of which "
            + str(params.get("_lit", 0)) + " lit, weather " + n(params["weather"])
            + ". One-point perspective, horizon y=860, vanishing point "
            "1200,860.\n"
            + "     Open ground kept for the camera: x 860-1540, y 860-1010; "
            "tallest ink y=614. Drawn for the black ground, no background of "
            "its own. -->\n")
    body = [head]
    for key in GROUPS:
        if not lay.g[key]:
            continue
        body.append('<g id="' + key + '" ' + GROUP_ATTRS[key] + ">\n")
        body.append("\n".join(lay.g[key]))
        body.append("\n</g>\n")
    body.append("</svg>\n")
    return "".join(body), lay


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--seed", type=int, default=1981)
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent.parent
                                         / "assets" / "scene" / "city.svg"))
    ap.add_argument("--rows", type=int, default=11)
    ap.add_argument("--towers", type=int, default=9)
    ap.add_argument("--windows", type=float, default=1.0)
    ap.add_argument("--floodlights", type=int, default=9)
    ap.add_argument("--lit", type=int, default=5)
    ap.add_argument("--weather", type=float, default=1.0)
    ap.add_argument("--height", type=float, default=1.0)
    ap.add_argument("--density", type=float, default=1.0)
    ap.add_argument("--grid", type=float, default=1.0)
    a = ap.parse_args()
    params = dict(rows=a.rows, towers=a.towers, windows=a.windows,
                  floodlights=a.floodlights, lit=a.lit, weather=a.weather,
                  height=a.height, density=a.density, grid=a.grid)
    svg, lay = build(a.seed, params)
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8", newline="\n") as fh:
        fh.write(svg)
    counts = " ".join(k + ":" + str(len(lay.g[k])) for k in GROUPS)
    counts += "  blocks " + str(params.get("_tally"))
    counts += "  lit " + str(params.get("_lit", 0)) + "  towers " + str(params.get("_towers", 0))
    print(str(out) + " " + str(len(svg.encode())) + " bytes  " + counts)


if __name__ == "__main__":
    main()
