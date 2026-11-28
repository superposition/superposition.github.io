/* The map's vocabulary: one form per record kind, and the rules that make the
   forms read as objects in one light.

   DIVULGE's lesson is that a record's kind has to survive being read without
   colour, so each kind is a different shape and a different count of sides —
   and the site's own page names it beside the shape in the bug line above the
   frame. Nothing here is a fill: every form is drawn as segments, which is what
   makes the same file usable by a line renderer and by an SVG.

   Forms are two-dimensional and live in the plane facing the composed camera:
   at the pose the page is composed for, a ring is a circle and a diamond is a
   diamond. The forms are then placed in the world once, and the camera moves
   around them — so the geometry is static and a frame costs no rebuild.

     datum    a ring with a crosshair and a mast: the station, the origin
     topic    a graduated ring, sixteen sides, sixteen ticks, three whiskers
     repo     a diamond, four sides
     unit     a triangle, three sides, apex up, three rungs on its base
     journal  a bracket, open to the right, three ticks down its bar
     entry    one tick, one line: an entry, when there is one

   Three rules live here, because both renderers have to agree about them and
   the still and the canvas must not be able to drift:

   1. ONE LIGHT. `LIGHT` states one azimuth in the frame's own plane. Every
      form segment is either lit (its outward normal faces the light) or in
      shadow; `faceOf` decides, `FACE` gives the value. The still bakes the
      answer per segment, the canvas bakes the same answer per segment, and
      neither can move the light without moving the other.

   2. ONE SILHOUETTE. `hull` is the outline a form hides: a nearer form's hull
      interrupts the edge behind it, and an edge stops at the hull of the form
      it lands on. The cut itself is `span()` in `camera.js`.

   3. ONE GRID for the names. `LABEL_GRID` is the row the labels' baselines sit
      on, the cap height they are set at, and the gap they keep from their
      form. `map.mjs` snaps to it and `measure.mjs` checks it. */

const TAU = Math.PI * 2;

/* One light: a flat key from the upper left, in the plane the map is composed
   in. 112 degrees is measured from the frame's +x axis, counter-clockwise, and
   is the direction the light comes *from*; it is off the diamonds' own axes so
   the two upper faces take it and the two lower faces fall away. */
export const LIGHT = { azimuth: 112, threshold: 0.05, shadow: 0.52 };

/* What a face keeps of its role's value: the lit face whole, the shadowed one
   a little over half. */
export const FACE = { lit: 1, shadow: LIGHT.shadow };

const LIGHT_X = Math.cos((LIGHT.azimuth * Math.PI) / 180);
const LIGHT_Y = Math.sin((LIGHT.azimuth * Math.PI) / 180);

/* A segment's face, from the normal that runs out of the form's centre through
   it. Two sides of a diamond take the light, two fall away; a triangle takes
   it on its two upper faces and loses its base. */
export const faceOf = (nx, ny) => {
  const l = Math.hypot(nx, ny) || 1;
  return (nx / l) * LIGHT_X + (ny / l) * LIGHT_Y > LIGHT.threshold ? 'lit' : 'shadow';
};

/* The two rhythms the plate repeats, in world units: a rung's pitch and
   half-length on a spine, and the journal arm's dash. They live here so the
   still and the canvas cannot draw a different number of marks from the same
   line -- the count is a function of the constant, not of each caller. */
export const RUNG = { pitch: 0.115, half: 0.024 };
export const DASH = { on: 0.036, off: 0.05 };

/* The rows the labels sit on, in the still's own units (1820 x 1000). A
   baseline is only on the grid when it is a whole number of rows below `top`:
   `top + k * row`. */
export const LABEL_GRID = { top: 16, row: 26, cap: 13, gap: 10, advance: 9.1 };

export const labelRow = (y) => {
  const k = Math.round((y - LABEL_GRID.top) / LABEL_GRID.row);
  return LABEL_GRID.top + k * LABEL_GRID.row;
};

const ring = (r, n, phase = -Math.PI / 2) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    const b = phase + ((i + 1) / n) * TAU;
    out.push([r * Math.cos(a), r * Math.sin(a), r * Math.cos(b), r * Math.sin(b)]);
  }
  return out;
};

const poly = (r, n, phase) => {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    return [p[0], p[1], q[0], q[1]];
  });
};

/* Ticks standing off a circle, outward, at a constant pitch. */
const ticks = (r, n, from, to, phase = -Math.PI / 2) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    out.push([r * Math.cos(a) * from, r * Math.sin(a) * from, r * Math.cos(a) * to, r * Math.sin(a) * to]);
  }
  return out;
};

/* Rungs on a straight run: n short strokes square to the run, at one pitch. */
const rungs = (x0, y0, x1, y1, n, half) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l;
  const ny = dx / l;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    out.push([cx - nx * half, cy - ny * half, cx + nx * half, cy + ny * half]);
  }
  return out;
};

export function form(kind, s) {
  switch (kind) {
    case 'datum':
      return [
        ...ring(s, 24),
        ...ring(s * 0.42, 12),
        ...ticks(s, 8, 1, 1.14),
        [-s * 1.72, 0, -s * 1.24, 0],
        [s * 1.24, 0, s * 1.72, 0],
        [0, s * 1.24, 0, s * 1.72],
        [0, s, 0, s * 2.2],
        [-s * 0.3, s * 1.9, s * 0.3, s * 1.9],
      ];
    case 'topic':
      return [
        ...ring(s, 16),
        ...ticks(s, 16, 0.86, 1),
        ...[-0.5, 0.55, 1.6].map((a) => {
          const c = Math.cos(a * Math.PI);
          const n = Math.sin(a * Math.PI);
          return [c * s * 1.18, n * s * 1.18, c * s * 1.62, n * s * 1.62];
        }),
      ];
    case 'repo':
      return poly(s, 4, -Math.PI / 2);
    case 'unit':
      return [
        ...poly(s * 0.92, 3, Math.PI / 2),
        ...rungs(-s * 0.92 * Math.cos(Math.PI / 6), -s * 0.46, s * 0.92 * Math.cos(Math.PI / 6), -s * 0.46, 3, s * 0.1),
      ];
    case 'journal':
      return [
        [-s * 0.5, -s * 0.95, -s * 0.5, s * 0.95],
        [-s * 0.5, s * 0.95, s * 0.25, s * 0.95],
        [-s * 0.5, -s * 0.95, s * 0.25, -s * 0.95],
        [s * 0.7, 0, s * 1.1, 0],
        ...rungs(-s * 0.5, -s * 0.95, -s * 0.5, s * 0.95, 3, s * 0.12),
      ];
    case 'entry':
      return [[-s, 0, s, 0]];
    default:
      return [];
  }
}

/* The outline a form hides, counter-clockwise, in the form's own units. This
   is the silhouette an edge is interrupted by -- the whiskers on a topic and
   the mast on the station are excluded, because they are thin enough that a
   line crossing them reads as a crossing, not as a cut. */
export function hull(kind, s) {
  switch (kind) {
    case 'topic':
      return Array.from({ length: 12 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 12) * TAU;
        return [s * Math.cos(a), s * Math.sin(a)];
      });
    case 'repo':
      return Array.from({ length: 4 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 4) * TAU;
        return [s * Math.cos(a), s * Math.sin(a)];
      });
    case 'unit':
      return Array.from({ length: 3 }, (_, i) => {
        const a = Math.PI / 2 + (i / 3) * TAU;
        return [s * 0.92 * Math.cos(a), s * 0.92 * Math.sin(a)];
      });
    case 'datum':
      return Array.from({ length: 12 }, (_, i) => {
        const a = -Math.PI / 2 + (i / 12) * TAU;
        return [s * 1.24 * Math.cos(a), s * 1.24 * Math.sin(a)];
      });
    case 'journal':
      return [
        [-s * 0.5, -s * 0.95],
        [s * 0.7, -s * 0.95],
        [s * 0.7, s * 0.95],
        [-s * 0.5, s * 0.95],
      ];
    case 'entry':
      return [
        [-s, -s * 0.5],
        [s, -s * 0.5],
        [s, s * 0.5],
        [-s, s * 0.5],
      ];
    default:
      return [];
  }
}

/* Local segments to world segments, in the plane the camera faces. `basis` is
   `view()`'s x and y: unit vectors across the frame. */
export function place(segs, centre, basis) {
  const { x, y } = basis;
  return segs.map(([ax, ay, bx, by]) => [
    [centre[0] + x[0] * ax + y[0] * ay, centre[1] + x[1] * ax + y[1] * ay, centre[2] + x[2] * ax + y[2] * ay],
    [centre[0] + x[0] * bx + y[0] * by, centre[1] + x[1] * bx + y[1] * by, centre[2] + x[2] * bx + y[2] * by],
  ]);
}

/* A face's outward normal, in the frame's plane, from the form's centre to the
   stroke's midpoint -- the same number in both renderers, because both place
   the form with `place()` and both read the midpoint. */
export function normalOf(seg, centre, basis) {
  const mx = (seg[0][0] + seg[1][0]) / 2 - centre[0];
  const my = (seg[0][1] + seg[1][1]) / 2 - centre[1];
  const mz = (seg[0][2] + seg[1][2]) / 2 - centre[2];
  return [mx * basis.x[0] + my * basis.x[1] + mz * basis.x[2], mx * basis.y[0] + my * basis.y[1] + mz * basis.y[2]];
}

/* Rungs along a run of world geometry: marks at a pitch that reads as a
   measurement rather than as noise, square to the run as the frame sees it, in
   the plane the map is composed in. */
export function run(a, b, { pitch = RUNG.pitch, half = RUNG.half } = {}, basis) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  /* The run's own direction, in the frame's plane, so a rung is square to the
     line it measures rather than square to the page. */
  const ux = dx * basis.x[0] + dy * basis.x[1] + dz * basis.x[2];
  const uy = dx * basis.y[0] + dy * basis.y[1] + dz * basis.y[2];
  const u = Math.hypot(ux, uy) || 1;
  const nx = -uy / u;
  const ny = ux / u;
  const n = Math.max(1, Math.round(l / pitch));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const c = [a[0] + dx * t, a[1] + dy * t, a[2] + dz * t];
    out.push(place([[-nx * half, -ny * half, nx * half, ny * half]], c, basis)[0]);
  }
  return out;
}

/* Dashes along a run: the pen's own rhythm, computed once so the still and the
   canvas lift it in the same places instead of one using a CSS dash array and
   the other a solid line. */
export function dash(a, b, { on = DASH.on, off = DASH.off } = {}) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const l = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const uz = dz / l;
  const out = [];
  for (let x = 0; x < l; x += on + off) {
    const e = Math.min(l, x + on);
    out.push([
      [a[0] + ux * x, a[1] + uy * x, a[2] + uz * x],
      [a[0] + ux * e, a[1] + uy * e, a[2] + uz * e],
    ]);
  }
  return out;
}
