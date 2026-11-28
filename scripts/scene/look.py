#!/usr/bin/env python3
"""Look at a rendered PNG the only way I can: as numbers and characters.

    python look.py FILE.png [--cols 100] [--crop x0,y0,x1,y1] [--json OUT]

Prints the frame as an ASCII ink map (luminance above the ground), the share of
lit pixels, the value histogram, and the per-cell density of a 4x4 grid. This is
a measurement of the *render*, not of the SVG, so it also catches a broken
include, a wrong aspect or a blank canvas.
"""

import argparse
import json

from PIL import Image


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("png")
    ap.add_argument("--cols", type=int, default=100)
    ap.add_argument("--crop", default="")
    ap.add_argument("--json", default="")
    ap.add_argument("--ramp", default=" .:-=+*#%@")
    args = ap.parse_args(argv)

    im = Image.open(args.png).convert("L")
    if args.crop:
        x0, y0, x1, y1 = (int(v) for v in args.crop.split(","))
        im = im.crop((x0, y0, x1, y1))
    W, H = im.size
    cols = args.cols
    rows = max(6, int(round(cols * H / W / 2.0)))
    small = im.resize((cols, rows), Image.BOX)
    px = list(small.getdata())

    ramp = args.ramp
    peak = max(px) or 1
    print("%s: %dx%d, %d cols, max luminance %d" % (args.png, W, H, cols, peak))
    lines = []
    for r in range(rows):
        row = px[r * cols:(r + 1) * cols]
        lines.append("".join(ramp[min(len(ramp) - 1, int((v / peak) ** 0.45 * (len(ramp) - 1)))] for v in row))
    for line in lines:
        print("  " + line)

    # Ink share and a 4x4 density of the same render.
    full = list(im.resize((240, 150), Image.BOX).getdata())
    lit = [v for v in full if v > 12]
    hist = {}
    for v in lit:
        bucket = int(v // 26) * 26
        hist[bucket] = hist.get(bucket, 0) + 1
    grid = [[0] * 4 for _ in range(4)]
    for i, v in enumerate(full):
        if v <= 12:
            continue
        x = i % 240
        y = i // 240
        grid[min(3, y * 4 // 150)][min(3, x * 4 // 240)] += v
    flat = [c for row in grid for c in row]
    mean = sum(flat) / 16 or 1
    out = {
        "file": args.png,
        "size": [W, H],
        "lit_fraction": round(len(lit) / max(1, len(full)), 4),
        "mean_lit": round(sum(lit) / max(1, len(lit)), 1),
        "value_hist": {str(k): round(v / max(1, len(lit)), 3) for k, v in sorted(hist.items())},
        "grid": [[round(v / 1e6, 2) for v in row] for row in grid],
        "empties": sum(1 for c in flat if c < 0.15 * mean),
        "dense_to_sparse": round(max(flat) / max(1, min(flat)), 1),
        "rows_empty": sum(1 for line in lines if set(line) <= {" "}),
    }
    print(json.dumps({k: v for k, v in out.items() if k != "grid"}, indent=1))
    print("grid (4x4, M-luminance):")
    for row in out["grid"]:
        print("  " + "  ".join("%7.2f" % v for v in row))
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
