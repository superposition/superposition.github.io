#!/usr/bin/env python3
"""Grow one specimen of the site's alien botany.

    python3 scripts/flora/grow.py --species spire --seed 4711 --out assets/flora/spire-4711.svg
    python3 scripts/flora/grow.py --list

Standard library only, and seeded: the same arguments always write the same
bytes. A seed moves the branching angle, the leaf count, the phyllotaxis, the
flower size, the petal count, the lean, the bounce and the spore count. It never
moves the species' identity, which is its silhouette — a tiered mast, a spiked
star, a grid thistle, elbowed bells, a fractal fern.

The viewBox is fixed at 600 x 900 with no width or height, so a page sizes the
drawing with CSS and the file never reserves the wrong box. The background is
transparent.

The palette below mirrors assets/tokens.css. It is a mirror, not a second
source of truth: the four flora accents are declared there with their measured
contrast, and this table has to change with them. The tones are baked into the
file because an <img> cannot read a CSS custom property; the page's own chrome
(the strata, the glow, the labels) is drawn in tokens.css and notebook.css.
"""

from __future__ import annotations

import argparse
import math
import os
import sys

# Mirrors assets/tokens.css. Change both together.
CREAM = "#e6dcc8"  # --cream   the outline
AMBER = "#ffc24a"  # --amber   the signal
CYAN = "#8fd3ff"   # --cyan    the second signal
BLOOM = "#ff8fa3"  # --flora-bloom
SPORE = "#9fe870"  # --flora-spore
LEAF = "#2f6b52"   # --flora-leaf

VIEW_W, VIEW_H = 600, 900
GROUND = 828
MID = 300.0
STROKE = 5.0


# --------------------------------------------------------------- the engine --

MASK = (1 << 64) - 1


class Rng:
    """splitmix64.

    A generator written out here rather than taken from `random`, so a seed
    means the same plant on every Python the site is built with: the stdlib
    makes no such promise, and a specimen that changes shape between two builds
    of the same commit would be a bug nobody could see.
    """

    def __init__(self, seed: int) -> None:
        self.state = (seed * 0x9E3779B97F4A7C15 + 0x2545F4914F6CDD1D) & MASK

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & MASK
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & MASK
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & MASK
        return z ^ (z >> 31)

    def unit(self) -> float:
        return (self.next_u64() >> 11) / float(1 << 53)

    def uniform(self, lo: float, hi: float) -> float:
        return lo + (hi - lo) * self.unit()

    def between(self, lo: int, hi: int) -> int:
        """An integer in [lo, hi], both ends included."""
        return lo + int(self.unit() * (hi - lo + 1))

    def signed(self) -> float:
        return -1.0 if self.unit() < 0.5 else 1.0

    def pick(self, seq):
        return seq[int(self.unit() * len(seq))]


def n(value: float) -> str:
    """One coordinate, rounded to two decimals and stripped of its zeroes."""
    text = f"{value:.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def shade(hex_colour: str, factor: float) -> str:
    """A darker tone of the same hue: the second tone of a two-tone fill."""
    value = hex_colour.lstrip("#")
    parts = [int(value[i:i + 2], 16) for i in (0, 2, 4)]
    return "#" + "".join(f"{max(0, min(255, round(c * factor))):02x}" for c in parts)


def stroke(fill: str, width: float = STROKE, colour: str = CREAM) -> str:
    return f'fill="{fill}" stroke="{colour}" stroke-width="{n(width)}" stroke-linejoin="round" stroke-linecap="round"'


def bare(fill: str) -> str:
    return f'fill="{fill}" stroke="{CREAM}" stroke-width="{n(STROKE)}" stroke-linejoin="round" stroke-linecap="round"'


def circle(cx: float, cy: float, r: float, fill: str, width: float = STROKE) -> str:
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" {stroke(fill, width)}/>'


def ellipse(cx: float, cy: float, rx: float, ry: float, fill: str, width: float = STROKE) -> str:
    return f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" {stroke(fill, width)}/>'


def poly(points, fill: str, width: float = STROKE) -> str:
    pts = " ".join(f"{n(x)},{n(y)}" for x, y in points)
    return f'<polygon points="{pts}" {stroke(fill, width)}/>'


def path(d: str, fill: str, width: float = STROKE) -> str:
    return f'<path d="{d}" {stroke(fill, width)}/>'


def line(d: str, colour: str = CREAM, width: float = STROKE) -> str:
    """A stroke. `pathLength="1"` is normalised here so a runtime can reveal the
    stroke by dashing it without measuring the path first."""
    return (f'<path d="{d}" pathLength="1" fill="none" stroke="{colour}" stroke-width="{n(width)}" '
            'stroke-linejoin="round" stroke-linecap="round"/>')


def quad(p0, p1, p2, t: float):
    """A point and its tangent on a quadratic curve."""
    mt = 1.0 - t
    x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
    y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
    dx = 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    dy = 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    length = math.hypot(dx, dy) or 1.0
    return (x, y), (dx / length, dy / length)


def d_quad(p0, p1, p2) -> str:
    return (f"M {n(p0[0])},{n(p0[1])} Q {n(p1[0])},{n(p1[1])} "
            f"{n(p2[0])},{n(p2[1])}")


def d_curve(points) -> str:
    """A smooth path through points, with a Catmull-Rom to Bezier pass."""
    if len(points) < 3:
        return f"M {n(points[0][0])},{n(points[0][1])} L {n(points[-1][0])},{n(points[-1][1])}"
    out = [f"M {n(points[0][0])},{n(points[0][1])}"]
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i > 0 else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0, p1[1] + (p2[1] - p0[1]) / 6.0)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0, p2[1] - (p3[1] - p1[1]) / 6.0)
        out.append(f"C {n(c1[0])},{n(c1[1])} {n(c2[0])},{n(c2[1])} {n(p2[0])},{n(p2[1])}")
    return " ".join(out)


def lens(cx: float, cy: float, angle: float, length: float, width: float) -> str:
    """A petal: a lens from the bloom's centre out to a tip at `angle`."""
    cos_a, sin_a = math.cos(angle), math.sin(angle)
    tip = (cx + cos_a * length, cy + sin_a * length)
    mid = (cx + cos_a * length * 0.52, cy + sin_a * length * 0.52)
    nx, ny = -sin_a * width, cos_a * width
    return (f"M {n(cx)},{n(cy)} Q {n(mid[0] + nx)},{n(mid[1] + ny)} {n(tip[0])},{n(tip[1])} "
            f"Q {n(mid[0] - nx)},{n(mid[1] - ny)} {n(cx)},{n(cy)} Z")


def leaf_blade(base, tip, width: float, bend: float = 0.25) -> str:
    """A tapered leaf from base to tip, bowed by `bend` of its own width."""
    (x0, y0), (x1, y1) = base, tip
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / length * width, dx / length * width
    c1 = (x0 + dx * 0.34 + nx * bend, y0 + dy * 0.34 + ny * bend)
    c2 = (x0 + dx * 0.34 - nx * bend, y0 + dy * 0.34 - ny * bend)
    return (f"M {n(x0)},{n(y0)} Q {n(c1[0])},{n(c1[1])} {n(x1)},{n(y1)} "
            f"Q {n(c2[0])},{n(c2[1])} {n(x0)},{n(y0)} Z")


class Specimen:
    """One plant's groups, in the order they are written to the file."""

    def __init__(self, species: str, seed: int) -> None:
        self.species = species
        self.seed = seed
        self.parts = {"stem": [], "leaves": [], "bud": [], "petals": [], "spores": []}
        self.bloom_at = (MID, 300.0)

    def add(self, group: str, markup: str) -> None:
        self.parts[group].append(markup)

    def svg(self) -> str:
        stem = "".join(self.parts["stem"])
        groups = [
            f'  <g id="stem" data-grow="stem">{stem}</g>',
            f'  <g id="leaves" data-grow="leaves">{"".join(self.parts["leaves"])}</g>',
            f'  <g id="bud" data-grow="bud">{"".join(self.parts["bud"])}</g>',
            f'  <g id="petals" data-bloom="petals" data-bloom-at="{n(self.bloom_at[0])} {n(self.bloom_at[1])}">'
            f'{"".join(self.parts["petals"])}</g>',
            f'  <g id="spores" data-bloom="spores">{"".join(self.parts["spores"])}</g>',
        ]
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}" '
                f'data-flora="{self.species}" data-seed="{self.seed}" aria-hidden="true">')
        return f"{head}\n" + "\n".join(groups) + "\n</svg>\n"


# ------------------------------------------------------------- the species --

def grow_spire(s: Specimen, rng: Rng) -> None:
    """Census Spire: discs stacked on a vertical mast, a nimbus at the crown."""
    lean = rng.uniform(-9, 9)
    bounce = rng.uniform(0.10, 0.26) * rng.signed()
    tiers = rng.between(3, 5)
    petals = rng.between(9, 13)
    crown_r = rng.uniform(84, 110)

    base = (MID, GROUND)
    top = (MID + lean, 248.0)
    ctrl = (MID + bounce * 150, 560.0)
    s.add("stem", line(d_quad(base, ctrl, top), CREAM, STROKE + 1))
    s.add("stem", line(d_quad(base, ctrl, top), LEAF, STROKE - 1.5))

    for i in range(tiers):
        t = 0.26 + 0.62 * (i / max(1, tiers - 1))
        (x, y), _ = quad(base, ctrl, top, t)
        scale = 1.0 - 0.38 * (i / max(1, tiers - 1))
        rx = rng.uniform(122, 156) * scale
        ry = max(9.0, rx * rng.uniform(0.15, 0.20))
        s.add("leaves", ellipse(x, y + ry * 0.7, rx, ry, shade(LEAF, 0.72)))
        s.add("leaves", ellipse(x, y, rx, ry, LEAF))
        for side in (-1, 1):
            s.add("leaves", circle(x + side * rx * 0.82, y + ry * 1.7,
                                   rng.uniform(7, 10) * scale, SPORE, STROKE - 1))
    (cx, cy), _ = quad(base, ctrl, top, 1.0)
    s.bloom_at = (cx, cy - crown_r * 0.18)

    s.add("bud", ellipse(cx, cy + crown_r * 0.30, crown_r * 0.52, crown_r * 0.26,
                         shade(BLOOM, 0.78)))
    s.add("petals", ellipse(cx, cy, crown_r, crown_r * 0.38, shade(BLOOM, 0.8)))
    for i in range(petals):
        angle = math.tau * i / petals + rng.uniform(-0.06, 0.06)
        length = crown_r * rng.uniform(1.1, 1.45)
        s.add("petals", f'<path data-petal="1" d="{lens(cx, cy, angle, length, length * 0.20)}" '
                        f'{stroke(BLOOM, STROKE - 1.5)}/>')
    s.add("petals", ellipse(cx, cy, crown_r * 0.34, crown_r * 0.15, AMBER))

    for _ in range(rng.between(1, 2)):
        side = rng.signed()
        s.add("spores", circle(cx + side * rng.uniform(170, 250), rng.uniform(330, 700),
                               rng.uniform(6, 10), SPORE, STROKE - 1.5))


def grow_synapse(s: Specimen, rng: Rng) -> None:
    """Synapse Star: a rosette, a fan of beaded tendrils, a spiked crown."""
    lean = rng.uniform(-14, 14)
    blades = rng.between(6, 7)
    tendrils = rng.between(4, 5)
    petals = rng.between(16, 21)
    crown_y = rng.uniform(228, 292)
    crown_x = MID + lean

    s.add("stem", line(d_curve([(MID, GROUND), (MID + 4, GROUND - 40), (crown_x, crown_y + 60)]),
                       CREAM, STROKE + 1))
    s.add("stem", line(d_curve([(MID, GROUND), (MID + 4, GROUND - 40), (crown_x, crown_y + 60)]),
                       LEAF, STROKE - 1.5))

    for i in range(blades):
        swing = -1.0 + 2.0 * i / (blades - 1)
        spread = 0.55 + 0.55 * abs(swing)
        tip = (MID + swing * rng.uniform(142, 216) * spread,
               GROUND - rng.uniform(64, 128) * (1.4 - abs(swing) * 0.5))
        s.add("leaves", path(leaf_blade((MID, GROUND - 6), tip, rng.uniform(22, 34),
                                        rng.uniform(-0.3, 0.3)), shade(LEAF, 0.74)))
        s.add("leaves", path(leaf_blade((MID, GROUND - 6),
                                        (MID + (tip[0] - MID) * 0.92, tip[1] + 6),
                                        rng.uniform(9, 14), 0.1), LEAF, STROKE - 1))

    for i in range(tendrils):
        swing = -1.0 + 2.0 * i / max(1, tendrils - 1)
        reach = rng.uniform(140, 244) * (1.1 - 0.35 * abs(swing))
        end = (MID + swing * reach, GROUND - rng.uniform(210, 430))
        ctrl = (MID + swing * reach * 1.5, GROUND - rng.uniform(60, 160))
        d = d_quad((MID, GROUND - 8), ctrl, end)
        s.add("stem", line(d, CREAM, STROKE + 1))
        s.add("stem", line(d, LEAF, STROKE - 2))
        s.add("leaves", circle(end[0], end[1], rng.uniform(10, 14), SPORE, STROKE - 1))

    s.bloom_at = (crown_x, crown_y)
    s.add("bud", ellipse(crown_x, crown_y + 6, 26, 26, shade(BLOOM, 0.7)))
    for i in range(petals):
        angle = math.tau * i / petals + rng.uniform(-0.05, 0.05)
        length = rng.uniform(80, 132) * (1.0 if i % 2 == 0 else 0.84)
        s.add("petals", f'<path data-petal="1" d="{lens(crown_x, crown_y, angle, length, length * 0.19)}" '
                        f'{stroke(AMBER, STROKE - 1.5)}/>')
    s.add("petals", circle(crown_x, crown_y, rng.uniform(21, 28), BLOOM))
    s.add("petals", circle(crown_x, crown_y, 9, CREAM, STROKE - 2))

    for _ in range(2):
        s.add("spores", circle(rng.uniform(90, 510), rng.uniform(300, 720),
                               rng.uniform(5, 9), SPORE, STROKE - 1.5))


def grow_lattice(s: Specimen, rng: Rng) -> None:
    """Lattice Thistle: square leaves, a faceted bloom on a grid, tiled spores."""
    lean = rng.uniform(-10, 10)
    leaves = rng.between(5, 7)
    hexes = rng.between(5, 8)
    hex_r = rng.uniform(25, 32)

    base = (MID, GROUND)
    top = (MID + lean, 300.0)
    ctrl = (MID + rng.uniform(-40, 40), 580.0)
    stem_d = d_quad(base, ctrl, top)
    s.add("stem", line(stem_d, CREAM, STROKE + 1))
    s.add("stem", line(stem_d, LEAF, STROKE - 1.5))

    for i in range(leaves):
        t = 0.14 + 0.62 * (i / max(1, leaves - 1))
        (x, y), _ = quad(base, ctrl, top, t)
        side = 1 if i % 2 == 0 else -1
        size = rng.uniform(66, 104) * (1.0 - 0.28 * i / max(1, leaves - 1))
        s.add("leaves", poly([(x, y), (x + side * size, y - size * 0.22),
                              (x + side * size * 0.92, y - size * 1.02),
                              (x - side * 6, y - size * 0.62)], shade(LEAF, 0.74)))
        s.add("leaves", poly([(x, y), (x + side * size * 0.7, y - size * 0.16),
                              (x + side * size * 0.64, y - size * 0.72),
                              (x - side * 3, y - size * 0.44)], LEAF, STROKE - 1.5))

    (cx, cy), _ = quad(base, ctrl, top, 1.0)
    s.bloom_at = (cx, cy - hex_r * 0.6)
    slots = [(dx, dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    start = rng.between(0, 4)
    chosen = [slots[(start + 4 * i) % 9] for i in range(hexes)]
    s.add("bud", ellipse(cx, cy + 4, hex_r * 1.5, hex_r * 1.1, shade(LEAF, 0.8)))
    for i, (dx, dy) in enumerate(chosen):
        hx = cx + dx * hex_r * 1.62
        hy = cy - hex_r * 0.6 + dy * hex_r * 1.44
        points = [(hx + hex_r * math.cos(math.tau * k / 6 + math.pi / 6),
                   hy + hex_r * math.sin(math.tau * k / 6 + math.pi / 6)) for k in range(6)]
        tone = CYAN if i % 2 == 0 else shade(CYAN, 0.72)
        s.add("petals", f'<path data-petal="1" d="M {n(points[0][0])},{n(points[0][1])} '
                        + " ".join(f"L {n(p[0])},{n(p[1])}" for p in points[1:])
                        + f' Z" {stroke(tone, STROKE - 1.5)}/>')

    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            tx = cx + rng.uniform(158, 215) + dx * 28
            ty = 300 + dy * 26 + rng.uniform(-16, 16)
            s.add("spores", poly([(tx - 9, ty - 9), (tx + 9, ty - 9),
                                  (tx + 9, ty + 9), (tx - 9, ty + 9)],
                                 BLOOM if (dx + dy) % 2 else shade(BLOOM, 0.75), STROKE - 2))


def grow_joint(s: Specimen, rng: Rng) -> None:
    """Joint Vine: an elbowed stem of dot joints, with pendant bells."""
    segments = rng.between(5, 7)
    bells = rng.between(2, 3)
    swing = rng.uniform(20, 30)
    lean = rng.uniform(-8, 8)

    points = [(MID, GROUND)]
    drop = (GROUND - 296.0) / segments
    for i in range(segments):
        side = 1 if i % 2 == 0 else -1
        points.append((points[-1][0] + side * swing * rng.uniform(0.7, 1.25),
                       points[-1][1] - drop * rng.uniform(0.86, 1.14)))

    limb = d_curve([(p[0], p[1]) for p in points])
    s.add("stem", line(limb, CREAM, STROKE + 4))
    s.add("stem", line(limb, LEAF, STROKE + 1))
    for i, (x, y) in enumerate(points[1:], start=1):
        s.add("stem", circle(x, y, rng.uniform(6.5, 9), AMBER, STROKE - 1.5))

    for i, (x, y) in enumerate(points[1:-1], start=1):
        side = 1 if i % 2 == 1 else -1
        reach = rng.uniform(74, 112)
        rise = rng.uniform(74, 118)
        s.add("leaves", poly([(x, y - 4), (x + side * reach, y - rise * 0.42),
                              (x + side * reach * 0.66, y - rise)],
                             LEAF))
        s.add("leaves", poly([(x, y - 8), (x + side * reach * 0.62, y - rise * 0.34),
                              (x + side * reach * 0.40, y - rise * 0.78)],
                             shade(LEAF, 0.74), STROKE - 1.5))

    crown_x, crown_y = points[-1]
    s.bloom_at = (crown_x, crown_y + 26)
    for i in range(bells):
        side = -1 if i % 2 == 0 else 1
        arm_x = crown_x + side * rng.uniform(46, 96)
        arm_y = crown_y + rng.uniform(-14, 34)
        arm = d_quad((crown_x, crown_y + 2), (crown_x + side * 20, arm_y - 26),
                     (arm_x, arm_y))
        s.add("stem", line(arm, CREAM, STROKE))
        w = rng.uniform(24, 34)
        h = rng.uniform(40, 58)
        bell = (f"M {n(arm_x - w)},{n(arm_y)} "
                f"Q {n(arm_x - w * 1.06)},{n(arm_y + h * 0.82)} {n(arm_x - w * 0.34)},{n(arm_y + h)} "
                f"Q {n(arm_x)},{n(arm_y + h * 1.16)} {n(arm_x + w * 0.34)},{n(arm_y + h)} "
                f"Q {n(arm_x + w * 1.06)},{n(arm_y + h * 0.82)} {n(arm_x + w)},{n(arm_y)} "
                f"Q {n(arm_x)},{n(arm_y + h * 0.22)} {n(arm_x - w)},{n(arm_y)} Z")
        s.add("bud", path(bell, shade(BLOOM, 0.8)))
        s.add("petals", f'<path data-petal="1" d="{bell}" {stroke(BLOOM, STROKE - 1.5)}/>')
        s.add("petals", circle(arm_x, arm_y + h * 0.62, w * 0.24, AMBER, STROKE - 2))

    for _ in range(2):
        s.add("spores", circle(rng.uniform(80, 520), rng.uniform(340, 740),
                               rng.uniform(5, 9), SPORE, STROKE - 1.5))


def grow_proof(s: Specimen, rng: Rng) -> None:
    """Proof Fern: fractal fronds under a seed capsule."""
    fronds = rng.between(5, 7)
    pinnae = rng.between(9, 11)
    spores = rng.between(3, 7)
    lean = rng.uniform(-10, 10)
    capsule_y = rng.uniform(182, 238)

    s.add("stem", line(d_curve([(MID, GROUND), (MID + lean * 0.4, GROUND - 90),
                                (MID + lean, capsule_y + 40)]), CREAM, STROKE + 1))
    s.add("stem", line(d_curve([(MID, GROUND), (MID + lean * 0.4, GROUND - 90),
                                (MID + lean, capsule_y + 40)]), LEAF, STROKE - 1.5))

    for i in range(fronds):
        swing = -1.0 + 2.0 * i / max(1, fronds - 1)
        length = rng.uniform(310, 470) * (1.0 - 0.26 * abs(swing))
        tip = (MID + swing * length * 0.62, GROUND - length)
        ctrl = (MID + swing * length * 0.18, GROUND - length * 0.52)
        rachis = d_quad((MID, GROUND - 4), ctrl, tip)
        s.add("stem", line(rachis, CREAM, STROKE + 1))
        s.add("stem", line(rachis, LEAF, STROKE - 2))
        for k in range(pinnae):
            t = 0.16 + 0.78 * (k / max(1, pinnae - 1))
            (px, py), (tx, ty) = quad((MID, GROUND - 4), ctrl, tip, t)
            side = 1 if k % 2 == 0 else -1
            size = length * 0.30 * (1.0 - t * 0.86)
            tip_p = (px + side * size * (tx * side + 0.55), py - size * 0.72)
            s.add("leaves", path(leaf_blade((px, py), tip_p, max(5.0, size * 0.30),
                                            rng.uniform(-0.2, 0.2)), LEAF, STROKE - 2))
            for j in range(2):
                sub_t = 0.42 + 0.4 * j
                sx = px + (tip_p[0] - px) * sub_t
                sy = py + (tip_p[1] - py) * sub_t
                s.add("leaves", path(leaf_blade((sx, sy),
                                                (sx + side * size * 0.36, sy - size * 0.40),
                                                max(3.0, size * 0.13), 0.1),
                                     shade(LEAF, 0.74), STROKE - 2.5))

    cx = MID + lean
    s.bloom_at = (cx, capsule_y + 26)
    capsule = (f"M {n(cx)},{n(capsule_y - 40)} "
               f"Q {n(cx + 36)},{n(capsule_y - 22)} {n(cx + 26)},{n(capsule_y + 22)} "
               f"Q {n(cx + 14)},{n(capsule_y + 60)} {n(cx)},{n(capsule_y + 64)} "
               f"Q {n(cx - 14)},{n(capsule_y + 60)} {n(cx - 26)},{n(capsule_y + 22)} "
               f"Q {n(cx - 36)},{n(capsule_y - 22)} {n(cx)},{n(capsule_y - 40)} Z")
    s.add("bud", f'<path d="{capsule}" {stroke(shade(SPORE, 0.72))}/>')
    s.add("petals", f'<path data-petal="1" d="{capsule}" {stroke(SPORE, STROKE - 1.2)}/>')
    s.add("petals", circle(cx, capsule_y + 4, 7.5, shade(SPORE, 0.62), STROKE - 2))
    s.add("petals", line(f"M {n(cx)}, {n(capsule_y + 14)} L {n(cx)}, {n(capsule_y + 38)}",
                         shade(SPORE, 0.5), 3.5))

    for i in range(spores):
        angle = math.tau * i / spores + rng.uniform(-0.4, 0.4)
        radius = rng.uniform(46, 128)
        s.add("spores", circle(cx + math.cos(angle) * radius,
                               capsule_y - 44 + math.sin(angle) * radius * 0.55,
                               rng.uniform(4.5, 8), SPORE if i % 2 else BLOOM, STROKE - 2))


SPECIES = {
    "spire": grow_spire,
    "synapse": grow_synapse,
    "lattice": grow_lattice,
    "joint": grow_joint,
    "proof": grow_proof,
}


# --------------------------------------------------------------------- main --

def grow(species: str, seed: int) -> str:
    specimen = Specimen(species, seed)
    SPECIES[species](specimen, Rng(seed))
    return specimen.svg()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Grow one specimen.")
    parser.add_argument("--species", choices=sorted(SPECIES))
    parser.add_argument("--seed", type=int)
    parser.add_argument("--out")
    parser.add_argument("--list", action="store_true", help="print the species and exit")
    args = parser.parse_args(argv)

    if args.list:
        print("\n".join(sorted(SPECIES)))
        return 0
    if not (args.species and args.seed is not None and args.out):
        parser.error("--species, --seed and --out are all required")

    markup = grow(args.species, args.seed)
    folder = os.path.dirname(args.out)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(markup)
    print(f"{args.species} seed {args.seed}: {len(markup.encode('utf-8'))} bytes -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
