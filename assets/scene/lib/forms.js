/* The map's vocabulary: one form per record kind.

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
     topic    a graduated ring, sixteen sides, three ticks outside
     repo     a diamond, four sides
     unit     a triangle, three sides, apex up
     journal  a bracket, open to the right: the arm with nothing on it yet
     entry    one tick, one line: an entry, when there is one            */

const TAU = Math.PI * 2;

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

export function form(kind, s) {
  switch (kind) {
    case 'datum':
      return [
        ...ring(s, 24),
        ...ring(s * 0.42, 12),
        [-s * 1.72, 0, -s * 1.24, 0],
        [s * 1.24, 0, s * 1.72, 0],
        [0, s * 1.24, 0, s * 1.72],
        [0, s, 0, s * 2.2],
        [-s * 0.3, s * 1.9, s * 0.3, s * 1.9],
      ];
    case 'topic':
      return [
        ...ring(s, 16),
        ...[-0.5, 0.55, 1.6].map((a) => {
          const c = Math.cos(a * Math.PI);
          const n = Math.sin(a * Math.PI);
          return [c * s * 1.18, n * s * 1.18, c * s * 1.62, n * s * 1.62];
        }),
      ];
    case 'repo':
      return poly(s, 4, -Math.PI / 2);
    case 'unit':
      return poly(s * 0.92, 3, Math.PI / 2);
    case 'journal':
      return [
        [-s * 0.5, -s * 0.95, -s * 0.5, s * 0.95],
        [-s * 0.5, s * 0.95, s * 0.25, s * 0.95],
        [-s * 0.5, -s * 0.95, s * 0.25, -s * 0.95],
        [s * 0.7, 0, s * 1.1, 0],
      ];
    case 'entry':
      return [[-s, 0, s, 0]];
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
