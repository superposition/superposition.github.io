#!/usr/bin/env python3
"""Compose the station scene: three drawn layers, the action, one document.

    python scripts/scene/compose.py --seed 20261127

Reads whatever layers exist under assets/scene/ (city.svg, station.svg,
traffic.svg), keeps their z-order, and writes one SVG at assets/art/station.svg
plus the same bytes at _includes/scene/station.svg, which /station/ includes
inline so the groups are in the page's DOM for CSS and for a script.

The layers are developed in parallel and may not all be here yet. A layer that
is missing becomes a placeholder frame that says so, in the drawing and in the
header comment: the composition still renders, still validates, and a re-run
after the layer lands replaces the frame with the drawing. Nothing about a
present layer is rewritten except its ids — they are prefixed with the layer
name (city-ground, station-collar …) so two layers cannot collide — and every
url(#…) and href="#…" that pointed at them is rewritten with them.

Ids reserved for the page, never prefixed:

    scene-ground  scene-city  scene-traffic-back  scene-haze  scene-station
    scene-traffic-front  scene-action  dock-mark  dock-arm  alignment-beam
    signal-carrier  signal-pulse  docking-shuttle  drone-a  drone-b

The action is placed from the station zone in the shared canvas contract
(x 560-1840, y 60-900), not from a measurement of the station drawing: the
drawing is fitted into that zone, so the truss spine, the docking hoop and the
approach line land in the same place whatever seed drew the station. The
fractions are the constants below, and docs/scene.md says what each one means.

Stdlib only, no external references, byte-identical on a re-run with the same
seed and the same layer bytes.
"""

import argparse
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

W = 2400.0
H = 1500.0
SEED = 20261127

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
NS_TAG = "{%s}" % SVG_NS

# The site's palette, written as hex because an SVG that stands alone cannot
# read a stylesheet. No other colour is named anywhere in this file.
GROUND = "#000000"
CREAM = "#efe6d3"
DUST = "#a79085"
AMBER = "#ffc24a"
CYAN = "#8fd3ff"

# The shared canvas contract. The station zone is what the action is placed
# from; the other two are only used to frame a placeholder.
STATION_ZONE = (560.0, 60.0, 1840.0, 900.0)
ZONES = {
    "station": STATION_ZONE,
    "city": (0.0, 860.0, 2400.0, 1500.0),
    "traffic": (0.0, 120.0, 2400.0, 1240.0),
}
HORIZON = 860.0

# Action geometry, as fractions of the station zone.
#   TRUSS_Y   the truss spine, a little above the zone's midline
#   TRUSS_X0/1 where the spine starts and ends, inside the zone
#   ARM_X     where the docking boom leaves the hull
#   HOOP      the alignment hoop the shuttle is aiming at
#   SHUTTLE   the shuttle's centre, below and left of the hoop, above the
#             horizon so it reads as being in space rather than over the yard
TRUSS_Y = 0.58
TRUSS_X0 = 0.05
TRUSS_X1 = 0.88
ARM_X = 0.84
HOOP = (0.95, 0.74)
SHUTTLE = (0.40, 0.86)

RESERVED = {
    "scene-ground", "scene-city", "scene-traffic-back", "scene-haze",
    "scene-station", "scene-traffic-front", "scene-action",
    "dock-mark", "dock-arm", "alignment-beam", "signal-carrier",
    "signal-pulse", "docking-shuttle", "drone-a", "drone-b",
    # the traffic layer's own two band ids: kept, because a reader looking for
    # the band should find the name the layer gave it
    "traffic-back", "traffic-front",
}

# Presentation attributes that inherit, so a layer that sets them on its root
# (traffic does) keeps them when its children move under a wrapper group.
INHERIT = (
    "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-dasharray", "stroke-opacity", "fill-opacity", "fill-rule",
    "opacity", "font-family", "font-size", "font-weight", "letter-spacing",
    "text-anchor",
)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
LAYER_DIR = ROOT / "assets" / "scene"
OUT_SCENE = ROOT / "assets" / "art" / "station.svg"
OUT_INCLUDE = ROOT / "_includes" / "scene" / "station.svg"

LAYERS = (
    ("city", "city.svg"),
    ("traffic", "traffic.svg"),
    ("station", "station.svg"),
)


class Rng:
    """mulberry32, the same generator the layers use: seedable, three lines to
    read, identical on every Python 3.8+."""

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


def fmt(value, places=1):
    """Fixed decimals, no trailing '.0', no '-0'. Keeps the bytes stable."""
    v = round(float(value), places)
    if v == 0.0:
        return "0"
    if v == int(v):
        return str(int(v))
    return ("%." + str(places) + "f") % v


def esc(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def attrs(pairs):
    return "".join(' %s="%s"' % (k, esc(str(v))) for k, v in pairs if v is not None)


# --------------------------------------------------------------- layers ----

class LayerError(Exception):
    pass


def read_layer(path):
    """Parse a layer; return (root, renderable children, bytes on disk)."""
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise LayerError("%s: %s" % (path, exc))
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise LayerError("%s is not well-formed XML: %s" % (path, exc))
    if root.tag not in (NS_TAG + "svg", "svg"):
        raise LayerError("%s has no <svg> root" % path)
    box = (root.get("viewBox") or "").replace(",", " ").split()
    if box != ["0", "0", "2400", "1500"]:
        raise LayerError(
            "%s declares viewBox %r; the shared canvas is '0 0 2400 1500'"
            % (path, root.get("viewBox"))
        )
    # A layer's own title names the layer; the composed document has its own,
    # and an accessible name on a decorative-in-context group only repeats it.
    children = [c for c in list(root) if c.tag not in (NS_TAG + "title", NS_TAG + "desc")]
    inherited = [(k, root.get(k)) for k in INHERIT if root.get(k) is not None]
    return root, children, len(raw), inherited


def split_traffic(children):
    """Traffic draws in two bands. Anything that is not the front band stays in
    the back, so a layer that has not split yet still composes."""
    back, front = [], []
    for child in children:
        (front if child.get("id") == "traffic-front" else back).append(child)
    if not front:
        return list(children), []
    return back, front


def prefix_ids(elements, prefix):
    """Prefix every id under `elements` and rewrite the references to them, so
    two layers cannot collide in one document. Reserved ids are left alone."""
    renames = {}
    for top in elements:
        for node in top.iter():
            old = node.get("id")
            if not old or old in RESERVED or old.startswith("scene-"):
                continue
            new = "%s-%s" % (prefix, old)
            renames[old] = new
            node.set("id", new)
    if not renames:
        return 0
    href_keys = ("href", "{%s}href" % XLINK_NS)
    for top in elements:
        for node in top.iter():
            for key, value in list(node.attrib.items()):
                if not value:
                    continue
                out = value
                for old, new in renames.items():
                    out = out.replace("url(#%s)" % old, "url(#%s)" % new)
                    if key in href_keys and out == "#" + old:
                        out = "#" + new
                if out != value:
                    node.set(key, out)
    return len(renames)


def serialize(elements):
    """The elements as one string, with the namespace declaration the
    temporary wrapper adds removed."""
    if not elements:
        return ""
    ET.register_namespace("", SVG_NS)
    ET.register_namespace("xlink", XLINK_NS)
    wrapper = ET.Element(NS_TAG + "g")
    for child in elements:
        wrapper.append(child)
    text = ET.tostring(wrapper, encoding="unicode")
    return text[text.index(">") + 1:-len("</g>")]


def band(name, elements, inherited=(), indent="  "):
    """A z-band: one wrapper group, the layer's inheriting presentation
    attributes copied onto it, its children inside."""
    pairs = [("id", name)]
    pairs.extend(inherited)
    return "%s<g%s>\n%s%s\n%s</g>" % (
        indent, attrs(pairs), indent + "  ", serialize(elements), indent
    )


def placeholder(name, zone, label, detail, indent="  "):
    """A missing layer, drawn as what it is: a measured frame with its own name
    in it, so the scene stays a scene and the page can say which layer is late."""
    x0, y0, x1, y1 = zone
    cx = (x0 + x1) / 2.0
    cy = (y0 + y1) / 2.0
    return "\n".join([
        '%s<g id="%s" data-layer="placeholder" fill="none" stroke="%s" stroke-width="1">'
        % (indent, name, DUST),
        '%s  <rect x="%s" y="%s" width="%s" height="%s" stroke-dasharray="24 24" '
        'stroke-opacity="0.5"/>'
        % (indent, fmt(x0 + 8), fmt(y0 + 8), fmt(x1 - x0 - 16), fmt(y1 - y0 - 16)),
        '%s  <text x="%s" y="%s" fill="%s" stroke="none" font-family="IBM Plex Mono, monospace" '
        'font-size="19" letter-spacing="4" text-anchor="middle">%s</text>'
        % (indent, fmt(cx), fmt(cy - 6), DUST, esc(label.upper())),
        '%s  <text x="%s" y="%s" fill="%s" stroke="none" font-family="IBM Plex Mono, monospace" '
        'font-size="13" letter-spacing="1" text-anchor="middle">%s</text>'
        % (indent, fmt(cx), fmt(cy + 19), DUST, esc(detail)),
        "%s</g>" % indent,
    ])


# --------------------------------------------------------------- action ----

def knot(p0, p1, p2, p3, t):
    u = 1.0 - t
    return (
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    )


def drone(name, curve, t, size):
    """A drone on a lit path: the arc it rides, the stretch it has already
    flown picked out brighter, the body at its position, and the lamp."""
    p0, p1, p2, p3 = curve
    x, y = knot(p0, p1, p2, p3, t)
    xa, ya = knot(p0, p1, p2, p3, max(0.0, t - 0.06))
    hx, hy = knot(p0, p1, p2, p3, min(1.0, t + 0.01))
    heading = 0.0 if hx == x else math.degrees(math.atan2(hy - y, hx - x))
    s = size
    return "\n".join([
        '    <g id="%s">' % name,
        '      <path d="M%s %sC%s %s %s %s %s %s" stroke="%s" stroke-width="1" '
        'stroke-opacity="0.3" stroke-dasharray="3 9"/>'
        % (fmt(p0[0]), fmt(p0[1]), fmt(p1[0]), fmt(p1[1]), fmt(p2[0]), fmt(p2[1]),
           fmt(p3[0]), fmt(p3[1]), DUST),
        '      <path d="M%s %sL%s %s" stroke="%s" stroke-width="2" stroke-opacity="0.85"/>'
        % (fmt(xa), fmt(ya), fmt(x), fmt(y), CYAN),
        '      <g transform="translate(%s %s) rotate(%s)">' % (fmt(x), fmt(y), fmt(heading)),
        '        <path d="M%s 0H%sM0 %sV%s" stroke="%s" stroke-width="1"/>'
        % (fmt(-s), fmt(s), fmt(-s * 0.62), fmt(s * 0.62), CREAM),
        '        <path d="M%s 0L%s 0M0 %sL0 %s" stroke="%s" stroke-width="1"/>'
        % (fmt(-s), fmt(-s * 0.34), fmt(-s * 0.62), fmt(-s * 0.3), DUST),
        '        <circle r="2" fill="%s"/>' % AMBER,
        '        <circle r="6.5" fill="none" stroke="%s" stroke-width="1" stroke-opacity="0.5"/>'
        % CYAN,
        "      </g>",
        "    </g>",
    ])


def shuttle(centre, target):
    """The shuttle in its own frame — nose along +x, so one transform moves it
    along the approach line without redrawing anything. Returns (markup, nose
    position in scene coordinates)."""
    heading = math.degrees(math.atan2(target[1] - centre[1], target[0] - centre[0]))
    rad = math.radians(heading)
    nose = (centre[0] + 66.0 * math.cos(rad), centre[1] + 66.0 * math.sin(rad))
    # The named group is a bare handle: the transform that places the shuttle
    # sits on the child, so a stylesheet or a script can own the handle's own
    # transform without inheriting a position.
    body = "\n".join([
        '    <g id="docking-shuttle">',
        '      <g transform="translate(%s %s) rotate(%s)">'
        % (fmt(centre[0]), fmt(centre[1]), fmt(heading)),
        '        <path d="M66 0L38 -13L-12 -16L-44 -9L-44 9L-12 16L38 13Z" stroke="%s" '
        'stroke-width="2"/>' % CREAM,
        '        <path d="M38 -12L30 -5M38 12L30 5" stroke="%s" stroke-width="1"/>' % DUST,
        '        <path d="M40 -1L22 -7M40 1L22 7" stroke="%s" stroke-width="1"/>' % CYAN,
        '        <path d="M14 0H34" stroke="%s" stroke-width="1" stroke-opacity="0.75" '
        'stroke-dasharray="3 5"/>' % AMBER,
        '        <path d="M-44 -7H-62M-44 7H-62" stroke="%s" stroke-width="1"/>' % DUST,
        '        <path d="M-62 -8L-96 -11M-62 8L-96 11" stroke="%s" stroke-width="1" '
        'stroke-opacity="0.4" stroke-dasharray="7 9"/>' % CYAN,
        '        <circle cx="-52" cy="0" r="2" fill="%s"/>' % AMBER,
        '        <path d="M20 -8L10 -26" stroke="%s" stroke-width="1"/>' % DUST,
        '        <circle cx="10" cy="-27" r="1.6" fill="%s"/>' % CYAN,
        '        <path d="M64 0L58 -4M64 0L58 4" stroke="%s" stroke-width="1"/>' % AMBER,
        "      </g>",
        "    </g>",
    ])
    return body, nose


def beam_and_dock(nose, hoop, hull):
    """The alignment beam — centreline, both edges of the cone, three gates that
    narrow towards the hoop — then the boom the hoop hangs on, then the hoop."""
    dx = hoop[0] - nose[0]
    dy = hoop[1] - nose[1]
    length = math.hypot(dx, dy)
    px, py = -dy / length, dx / length

    def at(t, off=0.0):
        return (nose[0] + dx * t + px * off, nose[1] + dy * t + py * off)

    gates = []
    for t, half in ((0.34, 27.0), (0.55, 20.0), (0.74, 14.0)):
        a = at(t, half)
        b = at(t, -half)
        gates.append(
            '      <path d="M%s %sL%s %s" stroke="%s" stroke-width="2" stroke-opacity="0.55"/>'
            % (fmt(a[0]), fmt(a[1]), fmt(b[0]), fmt(b[1]), CYAN)
        )
    edge_a, edge_b = at(1.0, 24.0), at(1.0, -24.0)
    hub = at(0.9)

    return "\n".join([
        '    <g id="alignment-beam">',
        '      <path d="M%s %sL%s %sM%s %sL%s %s" stroke="%s" stroke-width="1" '
        'stroke-opacity="0.22"/>'
        % (fmt(nose[0]), fmt(nose[1]), fmt(edge_a[0]), fmt(edge_a[1]),
           fmt(nose[0]), fmt(nose[1]), fmt(edge_b[0]), fmt(edge_b[1]), CYAN),
        '      <path id="alignment-line" d="M%s %sL%s %s" stroke="%s" stroke-width="2" '
        'stroke-opacity="0.5" stroke-dasharray="12 8"/>'
        % (fmt(nose[0]), fmt(nose[1]), fmt(hub[0]), fmt(hub[1]), CYAN),
        "\n".join(gates),
        "    </g>",
        '    <g id="dock-arm">',
        '      <path d="M%s %sL%s %sM%s %sL%s %s" stroke="%s" stroke-width="1"/>'
        % (fmt(hull[0]), fmt(hull[1] - 7), fmt(hoop[0] - 4), fmt(hoop[1] - 9),
           fmt(hull[0]), fmt(hull[1] + 7), fmt(hoop[0] - 4), fmt(hoop[1] + 9), CREAM),
        '      <path d="M%s %sL%s %s" stroke="%s" stroke-width="1" stroke-opacity="0.45"/>'
        % (fmt(hull[0] - 14), fmt(hull[1]), fmt(hoop[0] - 26), fmt(hoop[1]), DUST),
        "    </g>",
        '    <g id="dock-mark">',
        '      <g transform="translate(%s %s)">' % (fmt(hoop[0]), fmt(hoop[1])),
        '        <circle r="13" fill="none" stroke="%s" stroke-width="1"/>' % CYAN,
        '        <circle r="5.5" fill="none" stroke="%s" stroke-width="1" stroke-opacity="0.8"/>'
        % CYAN,
        '        <path d="M-20 0H-13M13 0H20M0 -20V-13M0 13V20" stroke="%s" stroke-width="2"/>'
        % CYAN,
        '        <path d="M-24 -24L-15 -15M24 -24L15 -15" stroke="%s" stroke-width="1" '
        'stroke-opacity="0.55"/>' % AMBER,
        "      </g>",
        "    </g>",
    ])


def measure_truss(children):
    """The truss spine, walked off the station layer.

    A truss is drawn as a chain of short segments that continue one another in
    one direction, and nothing else on the station is that long and that
    straight. So: collect the segments, walk forward from each one while the
    next continues it within six degrees, and keep the longest walk. That is the
    chord the pulse rides, and it follows the camera the station was drawn
    through instead of assuming the spine came out level. Falls back to the
    contract's horizontal when the walk is shorter than half the zone."""
    x0, y0, x1, y1 = STATION_ZONE
    zone_width = x1 - x0

    def key(point):
        return (round(point[0], 1), round(point[1], 1))

    def heading(a, b):
        return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))

    segments = []
    for top in children:
        for node in top.iter():
            d = node.get("d")
            if not d:
                continue
            for chunk in d.split("M")[1:]:
                numbers = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", chunk)]
                points = list(zip(numbers[0::2], numbers[1::2]))
                for a, b in zip(points, points[1:]):
                    if a != b:
                        segments.append((a, b))

    starts = {}
    for index, (a, _) in enumerate(segments):
        starts.setdefault(key(a), []).append(index)

    best = (0.0, None)
    for a, b in segments:
        if abs(b[0] - a[0]) < 20:
            continue
        direction = heading(a, b)
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        current = b
        for _ in range(48):
            step = None
            for index in starts.get(key(current), ()):
                c, d = segments[index]
                if abs(((heading(c, d) - direction + 180) % 360) - 180) > 6:
                    continue
                step = d
                break
            if step is None:
                break
            length += math.hypot(step[0] - current[0], step[1] - current[1])
            current = step
        if length > best[0]:
            best = (length, (a, current))

    if best[1] is None or best[0] < zone_width * 0.45:
        return (
            (x0 + zone_width * TRUSS_X0, y0 + (y1 - y0) * TRUSS_Y),
            (x0 + zone_width * TRUSS_X1, y0 + (y1 - y0) * TRUSS_Y),
        )
    return best[1]


def pulse(start, end):
    """The carrier along the truss and the pulse riding it. The truss is rarely
    level — the station is drawn through a camera, so its spine tilts — and the
    carrier is a line between the two measured ends while the pulse rides a
    rotated frame, so the page can move it along x and it still follows the
    truss instead of drifting off it."""
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    nx, ny = -uy * 5.5, ux * 5.5
    ticks = []
    along = 0.0
    while along < length - 24.0:
        x = start[0] + ux * along
        y = start[1] + uy * along
        ticks.append(
            '<path d="M%s %sL%s %s" stroke="%s" stroke-width="1" stroke-opacity="0.3"/>'
            % (fmt(x + nx), fmt(y + ny), fmt(x - nx), fmt(y - ny), AMBER)
        )
        along += 96.0
    # A little along, so its tails sit on the carrier rather than hanging off
    # the head of the truss in the still; the page moves it the rest of the way,
    # and a reader with reduced motion gets it where the file put it.
    px = start[0] + ux * length * 0.14
    py = start[1] + uy * length * 0.14
    angle = math.degrees(math.atan2(dy, dx))
    return "\n".join([
        '    <g id="signal-carrier">',
        '      <path d="M%s %sL%s %s" stroke="%s" stroke-width="1" stroke-opacity="0.2"/>'
        % (fmt(start[0]), fmt(start[1]), fmt(end[0]), fmt(end[1]), AMBER),
        "      <g>%s</g>" % "".join(ticks),
        "    </g>",
        '    <g transform="translate(%s %s) rotate(%s)">' % (fmt(px), fmt(py), fmt(angle)),
        '      <g id="signal-pulse">',
        '        <path d="M-118 0H-52" stroke="%s" stroke-width="1" stroke-opacity="0.16"/>'
        % AMBER,
        '        <path d="M-52 0H-14" stroke="%s" stroke-width="2" stroke-opacity="0.4"/>' % AMBER,
        '        <circle r="7" fill="none" stroke="%s" stroke-width="1" stroke-opacity="0.3"/>'
        % AMBER,
        '        <circle r="4" fill="%s"/>' % AMBER,
        "      </g>",
        "    </g>",
    ])


def haze(rng):
    """Dust at 1px: atmosphere between the traffic behind and the station, so the
    layers have air between them. Seeded, so it is the same haze every build,
    and light enough to cost one paint."""
    lines = []
    for _ in range(34):
        y = rng.uni(250.0, 840.0)
        x = rng.uni(-40.0, 1600.0)
        length = rng.uni(120.0, 760.0)
        opacity = fmt(rng.uni(0.07, 0.17), 2)
        dash = ' stroke-dasharray="2 7"' if rng.rand() < 0.42 else ""
        lines.append(
            '      <path d="M%s %sH%s" stroke="%s" stroke-width="1" stroke-opacity="%s"%s/>'
            % (fmt(x), fmt(y), fmt(x + length), DUST, opacity, dash)
        )
    for _ in range(5):
        y = rng.uni(300.0, 800.0)
        x = rng.uni(200.0, 900.0)
        lines.append(
            '      <path d="M%s %sQ%s %s %s %s" stroke="%s" stroke-width="1" '
            'stroke-opacity="0.12" fill="none"/>'
            % (fmt(x), fmt(y), fmt(x + 220), fmt(y - 26), fmt(x + 470), fmt(y + 6), CREAM)
        )
    return '  <g id="scene-haze" fill="none">\n%s\n  </g>' % "\n".join(lines)


def action(rng, truss):
    x0, y0, x1, y1 = STATION_ZONE
    w, h = x1 - x0, y1 - y0
    hoop = (x0 + w * HOOP[0], y0 + h * HOOP[1])
    shuttle_at = (x0 + w * SHUTTLE[0], y0 + h * SHUTTLE[1])
    hull = (x0 + w * ARM_X, y0 + h * 0.7)
    if shuttle_at[1] > HORIZON - 24.0:
        shuttle_at = (shuttle_at[0], HORIZON - 24.0)

    shuttle_markup, nose = shuttle(shuttle_at, hoop)
    return "\n".join([
        '  <g id="scene-action" fill="none" stroke-linecap="round" stroke-linejoin="round">',
        beam_and_dock(nose, hoop, hull),
        shuttle_markup,
        drone("drone-a", ((-90.0, 690.0), (760.0, 556.0), (1560.0, 512.0), (2490.0, 640.0)), 0.34, 13.0),
        drone("drone-b", ((2490.0, 300.0), (1720.0, 236.0), (880.0, 372.0), (-90.0, 306.0)), 0.62, 10.0),
        pulse(truss[0], truss[1]),
        "  </g>",
    ])


# ------------------------------------------------------------- document ----

def compose(seed, layer_dir):
    """Return (svg text, report lines, what is present, what is missing)."""
    report, present, missing = [], {}, []
    for key, filename in LAYERS:
        path = layer_dir / filename
        if not path.exists():
            missing.append(key)
            report.append("%-8s missing (%s) — placeholder drawn" % (key, path))
            continue
        try:
            root, children, size, inherited = read_layer(path)
        except LayerError as exc:
            missing.append(key)
            report.append("%-8s skipped — %s" % (key, exc))
            continue
        present[key] = {"children": children, "size": size, "inherited": inherited,
                        "path": path}
        report.append("%-8s %s, %s bytes" % (key, path, "{:,}".format(size)))

    rng = Rng(seed)
    body = ['  <g id="scene-ground">',
            '    <rect x="0" y="0" width="%s" height="%s" fill="%s"/>' % (fmt(W), fmt(H), GROUND),
            "  </g>"]

    if "city" in present:
        city = present["city"]
        prefix_ids(city["children"], "city")
        body.append("  <!-- scene-city: assets/scene/city.svg -->")
        body.append(band("scene-city", city["children"], city["inherited"]))
    else:
        body.append(placeholder("scene-city", ZONES["city"], "city layer not drawn",
                                "assets/scene/city.svg"))

    back, front = split_traffic(present["traffic"]["children"]) if "traffic" in present else ([], [])
    if back:
        traffic = present["traffic"]
        prefix_ids(back, "traffic")
        body.append("  <!-- scene-traffic-back: assets/scene/traffic.svg#traffic-back -->")
        body.append(band("scene-traffic-back", back, traffic["inherited"]))
    else:
        body.append(placeholder("scene-traffic-back", ZONES["traffic"],
                                "traffic layer not drawn", "assets/scene/traffic.svg"))

    body.append(haze(rng))

    if "station" in present:
        station = present["station"]
        prefix_ids(station["children"], "station")
        body.append("  <!-- scene-station: assets/scene/station.svg -->")
        body.append(band("scene-station", station["children"], station["inherited"]))
    else:
        body.append(placeholder("scene-station", ZONES["station"],
                                "station layer not drawn", "assets/scene/station.svg"))

    truss = measure_truss(present["station"]["children"]) if "station" in present else (
        (STATION_ZONE[0] + 1280 * TRUSS_X0, STATION_ZONE[1] + 840 * TRUSS_Y),
        (STATION_ZONE[0] + 1280 * TRUSS_X1, STATION_ZONE[1] + 840 * TRUSS_Y),
    )

    if front:
        prefix_ids(front, "traffic")
        body.append("  <!-- scene-traffic-front: assets/scene/traffic.svg#traffic-front -->")
        body.append(band("scene-traffic-front", front, present["traffic"]["inherited"]))
    else:
        body.append("  <!-- scene-traffic-front: empty — the traffic layer draws one band, "
                    "or is not here yet; the id stays in the document so a script can "
                    "address it -->")
        body.append('  <g id="scene-traffic-front"/>')

    head = ["<?xml version=\"1.0\" encoding=\"utf-8\"?>", "<!--",
            "  Composed by scripts/scene/compose.py — do not edit this file.",
            "  seed %d" % seed]
    for key, filename in LAYERS:
        if key in present:
            head.append("  %-8s assets/scene/%s, %s bytes"
                        % (key, filename, "{:,}".format(present[key]["size"])))
        else:
            head.append("  %-8s MISSING — a placeholder frame is drawn in its place" % key)
    head.append("  Regenerate: python scripts/scene/compose.py, seed %d" % seed)
    head.append("-->")
    head.append('<svg xmlns="%s" viewBox="0 0 %s %s" role="img" '
                'aria-labelledby="station-scene-title station-scene-desc">' % (SVG_NS, fmt(W), fmt(H)))
    head.append('  <title id="station-scene-title">The station above the city, with a shuttle on '
                'final approach</title>')
    desc = ("A technical elevation on black. At the back, the city and its launch yard below "
            "the horizon at y 860, drawn in one-point perspective. Behind and in front of the "
            "station, orbital traffic on dotted tracks. Between them the station: a truss "
            "spine, habitat rings, solar wings, a gantry. Dust haze at one pixel in the air "
            "behind the station. In front of it all, the action: a shuttle on final approach "
            "to a docking hoop, an alignment beam between its nose and the hoop, two drones "
            "crossing the frame on lit paths, and a signal pulse travelling the truss.")
    if missing:
        desc += " Not drawn yet: %s." % ", ".join(missing)
    head.append('  <desc id="station-scene-desc">%s</desc>' % esc(desc))
    head.append("")
    head.append("\n".join(body))
    head.append(action(rng, truss))
    head.append("</svg>")
    return "\n".join(head) + "\n", report, present, missing


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--layers", default=str(LAYER_DIR),
                        help="directory the three layer SVGs are read from")
    parser.add_argument("--out", default=None,
                        help="write one path instead of the two the page needs")
    parser.add_argument("--check", action="store_true",
                        help="write nothing; exit 1 when a committed file differs from what "
                             "this seed draws")
    args = parser.parse_args(argv)

    text, report, present, missing = compose(args.seed, Path(args.layers))
    targets = [Path(args.out)] if args.out else [OUT_SCENE, OUT_INCLUDE]

    if args.check:
        stale = 0
        for target in targets:
            if not target.exists():
                print("compose: %s is missing" % target)
                stale += 1
            elif target.read_text(encoding="utf-8") != text:
                print("compose: %s is stale — re-run python scripts/scene/compose.py" % target)
                stale += 1
        print("compose: %s" % ("clean" if not stale else "%d file(s) out of date" % stale))
        return 1 if stale else 0

    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        print("compose: wrote %s (%s bytes)"
              % (target, "{:,}".format(len(text.encode("utf-8")))))
    for line in report:
        print("compose: %s" % line)
    print("compose: seed %d, %d of %d layers drawn%s"
          % (args.seed, len(present), len(LAYERS),
             "" if not missing else ", placeholders for " + ", ".join(missing)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
