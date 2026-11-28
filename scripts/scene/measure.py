#!/usr/bin/env python3
"""Measure a scene drawing: ink, values, density, pitch — the numbers that stand
in for eyes.

    python scripts/scene/measure.py FILE.svg [--grid 4] [--ascii 76] [--json OUT]

Prints a report a person can check and a machine-readable JSON. The metrics are
the ones the craft pass is judged on:

  ink            stroke length x stroke width, summed — the drawing's weight
  value steps    composite luminance of each (colour, width, opacity) class on
                 the black ground, and its share of the ink
  roles          the share of ink in each value band (near / mid / far)
  density        4x4 grid of ink per cell: the empty-to-dense ratio, and how
                 many cells are deliberate empties
  pitch          repeated detail: the modal gap between parallel neighbours
                 inside a class, detected rather than declared

Stdlib only; no rendering, so it measures the document, not a screenshot.
"""

import argparse
import json
import math
import re
import xml.etree.ElementTree as ET

NS = "{http://www.w3.org/2000/svg}"
NUM = re.compile(r"[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")

CREAM = "#efe6d3"
DUST = "#a79085"
AMBER = "#ffc24a"
CYAN = "#8fd3ff"
RED = "#e2402f"


def nums(text):
    return [float(v) for v in NUM.findall(text or "")]


def luminance(hexcolour):
    """Relative luminance of a hex colour, 0..1 (sRGB, no gamma theatre)."""
    h = (hexcolour or "#000000").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) < 6:
        return 0.0
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def parse_path(d):
    """M/L/H/V/Z, and C/Q as sampled polylines. Subpaths come back separately."""
    out = []
    cur = []
    x = y = 0.0
    sx = sy = 0.0
    tokens = re.findall(r"[MmLlHhVvZzCcQqAa]|" + NUM.pattern, d or "")
    i = 0
    cmd = None
    closed = False

    def flush():
        nonlocal cur
        if len(cur) >= 2:
            out.append((cur, closed))
        cur = []

    while i < len(tokens):
        t = tokens[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t
            i += 1
            if cmd in "Zz":
                closed = True
                flush()
                x, y = sx, sy
                closed = False
                continue
            continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == "M":
            nx, ny = float(tokens[i]), float(tokens[i + 1])
            i += 2
            if rel:
                nx, ny = x + nx, y + ny
            flush()
            x, y = nx, ny
            sx, sy = x, y
            cmd = "l" if rel else "L"
            cur = [(x, y)]
        elif c == "L":
            nx, ny = float(tokens[i]), float(tokens[i + 1])
            i += 2
            if rel:
                nx, ny = x + nx, y + ny
            x, y = nx, ny
            cur.append((x, y))
        elif c == "H":
            nx = float(tokens[i])
            i += 1
            x = x + nx if rel else nx
            cur.append((x, y))
        elif c == "V":
            ny = float(tokens[i])
            i += 1
            y = y + ny if rel else ny
            cur.append((x, y))
        elif c == "A":
            rx, ry, rot, large, sweep = (float(tokens[i + k]) for k in range(5))
            nx, ny = float(tokens[i + 5]), float(tokens[i + 6])
            i += 7
            if rel:
                nx, ny = x + nx, y + ny
            for px, py in arc_points((x, y), (nx, ny), rx, ry, rot, large, sweep):
                cur.append((px, py))
            x, y = nx, ny
        elif c in "CQ":
            n = 6 if c == "C" else 4
            vals = [float(v) for v in tokens[i:i + n]]
            i += n
            pts = []
            for k in range(0, n, 2):
                px, py = vals[k], vals[k + 1]
                pts.append((x + px, y + py) if rel else (px, py))
            if c == "C":
                p0, p1, p2, p3 = cur[-1], pts[0], pts[1], pts[2]
                for s in range(1, 13):
                    u = s / 12.0
                    mx = ((1 - u) ** 3 * p0[0] + 3 * (1 - u) ** 2 * u * p1[0]
                          + 3 * (1 - u) * u * u * p2[0] + u ** 3 * p3[0])
                    my = ((1 - u) ** 3 * p0[1] + 3 * (1 - u) ** 2 * u * p1[1]
                          + 3 * (1 - u) * u * u * p2[1] + u ** 3 * p3[1])
                    cur.append((mx, my))
            else:
                p0, p1, p2 = cur[-1], pts[0], pts[1]
                for s in range(1, 9):
                    u = s / 8.0
                    mx = (1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0]
                    my = (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]
                    cur.append((mx, my))
            x, y = cur[-1]
        else:
            i += 1
    flush()
    return out


def parse_circle(cx, cy, r, steps=48):
    return [((cx + r * math.cos(2 * math.pi * k / steps),
              cy + r * math.sin(2 * math.pi * k / steps))) for k in range(steps + 1)]


def arc_points(p0, p1, rx, ry, rot_deg, large, sweep):
    """Endpoint-parametrised elliptical arc, sampled. Enough to measure length."""
    if rx == 0 or ry == 0 or p0 == p1:
        return [p1]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(rot_deg)
    cphi, sphi = math.cos(phi), math.sin(phi)
    dx, dy = (p0[0] - p1[0]) / 2.0, (p0[1] - p1[1]) / 2.0
    x1 = cphi * dx + sphi * dy
    y1 = -sphi * dx + cphi * dy
    lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
    if lam > 1:
        rx *= math.sqrt(lam)
        ry *= math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    coef = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        coef = -coef
    cxp = coef * rx * y1 / ry
    cyp = -coef * ry * x1 / rx
    cx = cphi * cxp - sphi * cyp + (p0[0] + p1[0]) / 2.0
    cy = sphi * cxp + cphi * cyp + (p0[1] + p1[1]) / 2.0

    def angle(ux, uy, vx, vy):
        d = (ux * vx + uy * vy) / (math.hypot(ux, uy) * math.hypot(vx, vy) or 1)
        a = math.acos(max(-1.0, min(1.0, d)))
        return -a if ux * vy - uy * vx < 0 else a

    theta1 = angle(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
    theta2 = angle((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
    if not sweep and theta2 > 0:
        theta2 -= 2 * math.pi
    elif sweep and theta2 < 0:
        theta2 += 2 * math.pi
    steps = max(4, int(abs(theta2 - theta1) / (math.pi / 24)) + 1)
    out = []
    for k in range(1, steps + 1):
        t = theta1 + (theta2 - theta1) * k / steps
        px = cphi * rx * math.cos(t) - sphi * ry * math.sin(t) + cx
        py = sphi * rx * math.cos(t) + cphi * ry * math.sin(t) + cy
        out.append((px, py))
    return out


IDENT = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)  # a, b, c, d, e, f


def mat_mul(m, n):
    a1, b1, c1, d1, e1, f1 = m
    a2, b2, c2, d2, e2, f2 = n
    return (a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
            a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
            a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1)


def parse_transform(text):
    m = IDENT
    for name, args in re.findall(r"(\w+)\s*\(([^)]*)\)", text or ""):
        v = nums(args)
        if name == "translate":
            n = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif name == "scale":
            sx = v[0]
            sy = v[1] if len(v) > 1 else sx
            n = (sx, 0, 0, sy, 0, 0)
        elif name == "rotate":
            a = math.radians(v[0])
            ca, sa = math.cos(a), math.sin(a)
            n = (ca, sa, -sa, ca, 0, 0)
            if len(v) >= 3:
                n = mat_mul(mat_mul((1, 0, 0, 1, v[1], v[2]), n), (1, 0, 0, 1, -v[1], -v[2]))
        elif name == "matrix":
            n = tuple(v[:6])
        else:
            continue
        m = mat_mul(m, n)
    return m


def apply(m, points):
    a, b, c, d, e, f = m
    return [(a * x + c * y + e, b * x + d * y + f) for x, y in points]


class Stroke:
    __slots__ = ("id", "group", "points", "width", "colour", "opacity", "dash", "text")

    def __init__(self, sid="", group="", points=None, width=1.0, colour="#000000",
                 opacity=1.0, dash=False, text=False):
        self.id = sid
        self.group = group
        self.points = points or []
        self.width = width
        self.colour = colour
        self.opacity = opacity
        self.dash = dash
        self.text = text


def collect(path):
    root = ET.parse(path).getroot()
    strokes = []

    def walk(node, group, inherited, matrix, style_in):
        gid = node.get("id") or group
        opacity = inherited * float(node.get("opacity", 1.0) or 1.0)
        if node.get("stroke-opacity"):
            opacity *= float(node.get("stroke-opacity"))
        matrix = mat_mul(matrix, parse_transform(node.get("transform")))
        tag = node.tag.replace(NS, "")
        style = node.get("style") or ""
        colour = node.get("stroke")
        if colour is None and "stroke:" in style:
            colour = style.split("stroke:")[1].split(";")[0].strip()
        width = node.get("stroke-width")
        if width is None and "stroke-width:" in style:
            width = style.split("stroke-width:")[1].split(";")[0].strip()
        dash_attr = node.get("stroke-dasharray")
        colour = style_in[0] if colour is None else colour
        width = style_in[1] if width is None else width
        dash = (style_in[2] if dash_attr is None else bool(dash_attr))
        style_in = (colour, width, dash)
        w = float(width) if width else 1.0
        if tag == "path":
            for pts, _closed in parse_path(node.get("d")):
                strokes.append(Stroke(node.get("id", ""), gid, apply(matrix, pts), w, colour or "#000000", opacity, dash))
        elif tag == "polyline" or tag == "polygon":
            v = nums(node.get("points"))
            pts = [(v[i], v[i + 1]) for i in range(0, len(v) - 1, 2)]
            if tag == "polygon" and pts:
                pts = pts + [pts[0]]
            strokes.append(Stroke(node.get("id", ""), gid, apply(matrix, pts), w, colour or "#000000", opacity, dash))
        elif tag == "line":
            strokes.append(Stroke(node.get("id", ""), gid,
                                  apply(matrix, [(float(node.get("x1", 0)), float(node.get("y1", 0))),
                                                 (float(node.get("x2", 0)), float(node.get("y2", 0)))]),
                                  w, colour or "#000000", opacity, dash))
        elif tag in ("circle", "ellipse"):
            cx = float(node.get("cx", 0) or 0)
            cy = float(node.get("cy", 0) or 0)
            rx = float(node.get("r", node.get("rx", 0)) or 0)
            ry = float(node.get("r", node.get("ry", 0)) or 0)
            pad = 0.5
            pts = [(cx + (rx + pad) * math.cos(2 * math.pi * k / 48),
                    cy + (ry + pad) * math.sin(2 * math.pi * k / 48)) for k in range(49)]
            strokes.append(Stroke(node.get("id", ""), gid, apply(matrix, pts), w, colour or "#000000", opacity, dash))
        elif tag == "rect":
            x = float(node.get("x", 0) or 0)
            y = float(node.get("y", 0) or 0)
            rw = float(node.get("width", 0) or 0)
            rh = float(node.get("height", 0) or 0)
            pad = 0.5
            strokes.append(Stroke(node.get("id", ""), gid,
                                  apply(matrix, [(x - pad, y - pad), (x + rw + pad, y - pad),
                                                 (x + rw + pad, y + rh + pad), (x - pad, y + rh + pad),
                                                 (x - pad, y - pad)]),
                                  w, colour or "#000000", opacity, dash))
        elif tag == "text":
            strokes.append(Stroke(node.get("id", ""), gid, [], 0.0, node.get("fill") or "#000000",
                                  opacity, text=True))
        for child in node:
            walk(child, gid, opacity, matrix, style_in)

    body = root
    walk(body, "", 1.0, IDENT, (None, None, False))
    return strokes


def length(points):
    total = 0.0
    for a, b in zip(points, points[1:]):
        total += math.hypot(b[0] - a[0], b[1] - a[1])
    return total


def report(path, grid=4, ascii_cols=96, ascii_rows=0):
    allstrokes = collect(path)
    strokes = [s for s in allstrokes if not s.text and len(s.points) > 1]
    texts = [s for s in allstrokes if s.text]
    root = ET.parse(path).getroot()
    vb = nums(root.get("viewBox") or "")
    box = tuple(vb[:4]) if len(vb) == 4 else (0.0, 0.0, 2400.0, 1500.0)
    if ascii_rows <= 0:
        ascii_rows = max(8, int(round(ascii_cols * (box[3] - box[1]) / (box[2] - box[0]) / 2.0)))

    ink_total = 0.0
    classes = {}
    for s in strokes:
        ln = length(s.points)
        ink = ln * s.width
        ink_total += ink
        lum = luminance(s.colour) ** (1 / 2.2) * s.opacity
        key = (s.colour.lower(), s.width, round(s.opacity, 2), s.dash)
        entry = classes.setdefault(key, {"colour": s.colour.lower(), "width": s.width,
                                         "opacity": round(s.opacity, 2), "dash": s.dash,
                                         "length": 0.0, "ink": 0.0, "strokes": 0,
                                         "value": round(lum, 3)})
        entry["length"] += ln
        entry["ink"] += ink
        entry["strokes"] += 1

    # The roles are the drawing's own ink steps, read from the palette rather
    # than guessed from luminance: cream is the near structure, dust the middle
    # distance, dust at reduced alpha the far field, and amber/cyan/red are
    # accents that belong to no role. The black ground is fill, not ink: the
    # city uses it to occlude, so it is counted apart.
    def role_of(c):
        hexv = c["colour"]
        if hexv in ("#000000", "#0a0a0b", "#111111"):
            return "ground"
        if hexv in (AMBER, CYAN, RED):
            return "accent"
        if hexv == CREAM:
            return "near"
        if hexv == DUST:
            return "mid" if c["opacity"] >= 0.8 else "far"
        return "accent"

    role_ink = {"near": 0.0, "mid": 0.0, "far": 0.0, "accent": 0.0, "ground": 0.0}
    for c in classes.values():
        role_ink[role_of(c)] += c["ink"]
    ink_total = sum(role_ink[r] for r in ("near", "mid", "far", "accent")) or 1.0

    # 4x4 density across the frame, in ink per cell.
    w = box[2] - box[0]
    h = box[3] - box[1]
    cells = [[0.0] * grid for _ in range(grid)]
    for s in strokes:
        wgt = s.width
        for a, b in zip(s.points, s.points[1:]):
            steps = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 6))
            for k in range(steps + 1):
                t = k / steps
                x = a[0] + (b[0] - a[0]) * t
                y = a[1] + (b[1] - a[1]) * t
                gx = min(grid - 1, max(0, int((x - box[0]) / (w or 1) * grid)))
                gy = min(grid - 1, max(0, int((y - box[1]) / (h or 1) * grid)))
                cells[gy][gx] += math.hypot(b[0] - a[0], b[1] - a[1]) / (steps + 1) * wgt
    flat = [c for row in cells for c in row]
    mean = sum(flat) / len(flat) if flat else 0
    empties = [c for c in flat if c < 0.15 * mean]
    densest = max(flat) if flat else 0
    sparsest = min(flat) if flat else 0

    # Pitch: modal gap between parallel neighbours, per class. Segments shorter
    # than 240 units, bucketed by angle to 2 degrees and by class; the gaps are
    # rounded to 1 unit and the mode reported when it repeats at least 4 times.
    pitches = {}
    for s in strokes:
        key = (s.colour.lower(), s.width, round(s.opacity, 2))
        bucket = pitches.setdefault(key, {})
        for a, b in zip(s.points, s.points[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            ln = math.hypot(dx, dy)
            if ln < 6 or ln > 240:
                continue
            ang = math.degrees(math.atan2(dy, dx)) % 180
            ang = round(ang / 2.0) * 2.0 % 180
            normal = (-dy / ln, dx / ln)
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            offset = mid[0] * normal[0] + mid[1] * normal[1]
            bucket.setdefault(ang, []).append((offset, ln))
    found = []
    for key, buckets in pitches.items():
        for ang, items in buckets.items():
            if len(items) < 6:
                continue
            items.sort()
            gaps = [round((b[0] - a[0]) / 2.0) * 2 for a, b in zip(items, items[1:]) if b[0] - a[0] > 5]
            hist = {}
            for g in gaps:
                hist[g] = hist.get(g, 0) + 1
            for gap, count in sorted(hist.items(), key=lambda kv: -kv[1])[:3]:
                if count >= 4:
                    found.append({"colour": key[0], "width": key[1], "opacity": key[2],
                                  "angle": ang, "pitch": gap, "count": count})
    found.sort(key=lambda f: -f["count"])

    # ASCII: my eyes. Ink per character cell, quantised.
    amap = []
    cw = (box[2] - box[0]) / ascii_cols
    ch = (box[3] - box[1]) / ascii_rows
    acc = [[0.0] * ascii_cols for _ in range(ascii_rows)]
    for s in strokes:
        for a, b in zip(s.points, s.points[1:]):
            ln = math.hypot(b[0] - a[0], b[1] - a[1])
            steps = max(1, int(ln / max(2.0, cw * 0.4)))
            for k in range(steps + 1):
                t = k / steps
                x = a[0] + (b[0] - a[0]) * t
                y = a[1] + (b[1] - a[1]) * t
                gx = min(ascii_cols - 1, max(0, int((x - box[0]) / cw)))
                gy = min(ascii_rows - 1, max(0, int((y - box[1]) / ch)))
                acc[gy][gx] += ln / (steps + 1) * s.width
    peak = max((c for row in acc for c in row), default=0) or 1
    ramp = " .:-=+*#%@"
    for row in acc:
        amap.append("".join(ramp[min(len(ramp) - 1, int((c / peak) ** 0.42 * (len(ramp) - 1)))] for c in row))

    return {
        "file": path,
        "box": [round(v, 1) for v in box],
        "strokes": len(strokes),
        "texts": len(texts),
        "ink": round(ink_total, 1),
        "classes": sorted(classes.values(), key=lambda c: -c["ink"]),
        "roles": {k: round(v / ink_total, 4) if ink_total else 0 for k, v in role_ink.items()},
        "role_ratio": round((role_ink["near"] / role_ink["mid"]) if role_ink["mid"] else 0, 3),
        "grid": [[round(v / 1000.0, 2) for v in row] for row in cells],
        "grid_mean": round(mean / 1000.0, 2),
        "empty_cells": len(empties),
        "dense_to_sparse": round(densest / sparsest, 1) if sparsest else None,
        "pitches": found[:12],
        "ascii": amap,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description="Measure a scene drawing.")
    ap.add_argument("path")
    ap.add_argument("--grid", type=int, default=4)
    ap.add_argument("--ascii", type=int, default=76)
    ap.add_argument("--rows", type=int, default=30)
    ap.add_argument("--json", default="")
    ap.add_argument("--no-ascii", action="store_true")
    args = ap.parse_args(argv)

    data = report(args.path, args.grid, args.ascii, args.rows)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=1)
    print("%s: %d strokes, %d text, ink %.0f, box %s" % (
        args.path, data["strokes"], data["texts"], data["ink"], data["box"]))
    print("roles near/mid/far ink share: %.3f / %.3f / %.3f (near:mid %.2f)" % (
        data["roles"]["near"], data["roles"]["mid"], data["roles"]["far"], data["role_ratio"]))
    print("value classes:")
    for c in data["classes"][:12]:
        print("  %-8s w%-3s a%.2f%s value %.3f  ink %6.0f  share %.3f  %d strokes" % (
            c["colour"], c["width"], c["opacity"], " dash" if c["dash"] else "    ",
            c["value"], c["ink"], c["ink"] / data["ink"], c["strokes"]))
    print("density 4x4 (k ink):")
    for row in data["grid"]:
        print("  " + "  ".join("%7.2f" % v for v in row))
    print("empty cells %d/16, dense:sparse %s" % (data["empty_cells"], data["dense_to_sparse"]))
    print("pitches:")
    for p in data["pitches"]:
        print("  %-8s w%-2s a%.2f %3.0f deg  pitch %4.0f  x%d" % (
            p["colour"], p["width"], p["opacity"], p["angle"], p["pitch"], p["count"]))
    if not args.no_ascii:
        print("frame:")
        for line in data["ascii"]:
            print("  " + line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
