/* The camera, the one projection both renderers use, and the one depth ramp.

   The scene is composed in a 1.82 : 1 box -- the home hero's own ratio at a
   1440 x 900 window -- and the box keeps its width at every other window shape:
   the frame's width is the box's width and the height follows. A phone
   therefore shows the whole plate, smaller, rather than a crop of its middle.
   That is the one rule, written here, and the SVG obeys it with
   `preserveAspectRatio="xMidYMid meet"` on the same 1820 x 1000 viewBox -- the
   frame's remaining black is the page's own ground, so nothing looks letterboxed
   and the canvas and the still land on the same pixels at every window shape.

   DEPTH is the depth model, and it is the whole of the haze. Distance is
   measured in front of the camera and normalised against the composed orbit
   radius, so the numbers do not change when a page picks another radius:

       u = (distance - radius * near) / (radius * (far - near))

   `u` runs 0 at the nearest the composed plate ever comes and 1 at the far
   limit. Four stops sit on it, and every stroke in the plate takes the value of
   the stop it lands in -- there is no per-stroke dimming anywhere else:

       u <= highlight   highlight  1.00   the closest 5% of the ink, and only that
       u <= split[0]    near       0.88
       u <= split[1]    mid        0.60
       else             far        0.36

   Three roles with a step between them (near/mid 1.47, mid/far 1.67,
   near/far 2.44) and pure light spent on the nearest sliver, which is what
   makes the near field read as near rather than as merely brighter.

   The haze also takes length, not only value: an edge into the far field lifts
   its pen before it arrives (`HAZE.gap`), so a far edge is shorter as well as
   fainter -- see `span()`'s callers. */

export const ASPECT = 1.82;
const DEG = Math.PI / 180;

export const DEPTH = {
  near: 0.62,
  far: 1.62,
  split: [0.2, 0.38],
  highlight: 0.12,
  value: { highlight: 1, near: 0.88, mid: 0.6, far: 0.36 },
};

/* How much of a stroke's length the haze takes at each role, in frame units --
   1 is half the frame's width, and the still is 1820 units wide, so these are
   two and a half pixels mid, six far. Nothing near: a near edge stays whole. */
const FRAME_HALF = 910;
export const HAZE = { gap: { highlight: 0, near: 0, mid: 2.5 / FRAME_HALF, far: 6 / FRAME_HALF } };

const ramp = (cam) => cam.depth || DEPTH;

/* Camera state for one pose. `yaw` and `pitch` are degrees of orbit away from
   the base view; `dolly` scales the orbit radius (1 is the composed distance). */
export function state(cam, pose) {
  const p = pose || {};
  const yaw = (cam.azimuth || 0) * DEG + (p.yaw || 0) * DEG;
  const pitch = cam.elevation * DEG + (p.pitch || 0) * DEG;
  const r = cam.radius * (p.dolly === undefined ? 1 : p.dolly);
  const t = cam.target;
  const ce = Math.cos(pitch);
  return {
    eye: [t[0] + r * Math.sin(yaw) * ce, t[1] + r * Math.sin(pitch), t[2] + r * Math.cos(yaw) * ce],
    target: t,
    fov: cam.fov,
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* The view basis. Forms are drawn facing the camera, so this is also the plane
   they are built in -- which is why a ring reads as a circle at the composed
   pose rather than as an ellipse with a mind of its own. */
export function view(s) {
  const z = norm(sub(s.eye, s.target));
  const x = norm(cross([0, 1, 0], z));
  return { eye: s.eye, x, y: cross(z, x), z, fov: s.fov };
}

/* The composition box's width is the frame's width. */
export function scales(v, aspect) {
  const a = Math.max(0.28, Math.min(4.2, aspect));
  const tanX = Math.tan((v.fov * DEG) / 2) * ASPECT;
  return { tanX, tanY: tanX / a };
}

/* World point to normalised device coordinates, plus the distance in front of
   the camera that the depth ramp is read from. */
export function project(v, aspect, p) {
  const sc = scales(v, aspect);
  const d = sub(p, v.eye);
  const zc = -dot(d, v.z);
  if (zc <= 0.05) return null;
  return [dot(d, v.x) / (zc * sc.tanX), dot(d, v.y) / (zc * sc.tanY), zc];
}

/* Normalised device coordinates and a distance back to a world point: the
   inverse of `project()`, and what an edge is cut with. */
export function unproject(v, aspect, ndc, zc) {
  const sc = scales(v, aspect);
  const x = ndc[0] * zc * sc.tanX;
  const y = ndc[1] * zc * sc.tanY;
  return [
    v.eye[0] + v.x[0] * x + v.y[0] * y - v.z[0] * zc,
    v.eye[1] + v.x[1] * x + v.y[1] * y - v.z[1] * zc,
    v.eye[2] + v.x[2] * x + v.y[2] * y - v.z[2] * zc,
  ];
};

/* Distance in front of the camera, normalised to the composed plate: 0 at the
   nearest the map comes, 1 at the far limit of the ramp. */
export function depthUnit(cam, distance) {
  const d = ramp(cam);
  return Math.min(1, Math.max(0, (distance - cam.radius * d.near) / (cam.radius * (d.far - d.near))));
}

/* Which role a distance falls in: 'highlight', 'near', 'mid' or 'far'. */
export function depthAt(cam, distance) {
  const d = ramp(cam);
  const u = depthUnit(cam, distance);
  if (u <= d.highlight) return 'highlight';
  if (u <= d.split[0]) return 'near';
  if (u <= d.split[1]) return 'mid';
  return 'far';
}

/* What a stroke keeps of its value at that distance. */
export function valueAt(cam, distance) {
  return ramp(cam).value[depthAt(cam, distance)];
}

/* The interval of a screen-space segment that a convex silhouette covers.
   `poly` is the silhouette in normalised device coordinates, counter-clockwise;
   the segment is `pa`-`pb`, also in ndc. Returns [s0, s1] or null. */
function cover(pa, pb, poly) {
  let s0 = 0;
  let s1 = 1;
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const ex = q[0] - p[0];
    const ey = q[1] - p[1];
    const c0 = ex * (pa[1] - p[1]) - ey * (pa[0] - p[0]);
    const c1 = ex * (pb[1] - p[1]) - ey * (pb[0] - p[0]);
    if (c0 >= 0 && c1 >= 0) continue;
    if (c0 < 0 && c1 < 0) return null;
    const s = c0 / (c0 - c1);
    if (c0 < 0) s0 = Math.max(s0, s);
    else s1 = Math.min(s1, s);
    if (s0 >= s1) return null;
  }
  return s0 < s1 ? [s0, s1] : null;
}

/* The parts of an edge the camera can see.

   An edge is a straight line between two records; the plate is a set of forms
   in front of and behind it. A nearer form is opaque -- its silhouette hides
   the line behind it -- so the line is *cut*, not merely drawn under the form:
   the pen lifts where it passes behind and comes back on the far side. The
   same cut is applied at the form the edge lands on, so an edge terminates at
   a diamond's silhouette rather than at its centre.

   `occluders` is a list of `{ poly, z }`: each silhouette in ndc and the
   distance in front of the camera it sits at. `trim` lifts the pen at the two
   ends by an amount in frame units (1 is half the frame's width), which is the
   haze taking length from a far edge.

   Each span is then cut again wherever it crosses a depth role, so an edge
   steps down as it recedes instead of being dimmed evenly: the result is a
   list of `{ a, b, role, z }` in world space, which both renderers draw. */
export function pieces(cam, v, aspect, a, b, occluders, opts = {}) {
  const pa = project(v, aspect, a);
  const pb = project(v, aspect, b);
  if (!pa || !pb) return [];
  const za = pa[2];
  const zb = pb[2];
  const at = (s) => {
    const inv = 1 / za + s * (1 / zb - 1 / za);
    const z = 1 / inv;
    return { p: unproject(v, aspect, [pa[0] + s * (pb[0] - pa[0]), pa[1] + s * (pb[1] - pa[1])], z), z };
  };

  const opened = [];
  const attached = opts.attached || [];
  for (const o of occluders) {
    const s = cover(pa, pb, o.poly);
    if (!s) continue;
    /* The form an edge lands on always cuts it, at the depth it shares with
       the edge's own end -- otherwise an edge would still run to a centre. */
    if (attached.includes(o.id)) {
      opened.push([s[0], s[1]]);
      continue;
    }
    /* Depth decides: a form hides the line only where it is in front of it.
       The projection is affine in 1/z, so the crossing is one division. */
    const ia = 1 / za;
    const ib = 1 / zb;
    const io = 1 / o.z;
    let lo = s[0];
    let hi = s[1];
    if (Math.abs(ib - ia) > 1e-9) {
      const sc = (io - ia) / (ib - ia);
      if (ib > ia) hi = Math.min(hi, sc);
      else lo = Math.max(lo, sc);
    } else if (io <= ia) {
      continue;
    }
    if (hi > lo) {
      opened.push([lo, hi]);
    }
  }
  const length = Math.hypot(pb[0] - pa[0], (pb[1] - pa[1]) / aspect) || 1;

  /* A cut is opened by a little air -- a pixel and a half in the still's own
     units -- so the pen lands clear of the silhouette instead of exactly on
     it: a stroke that ends *on* an edge reads as a tangent, and a sampler
     looking for ink where the silhouette should have hidden it would find the
     end of the stroke and be right to. */
  const air = 1.5 / (length * FRAME_HALF);
  const cuts = opened.map(([lo, hi]) => [lo - air, hi + air]).sort((x, y) => x[0] - y[0]);

  /* The drawn intervals: everything the cuts leave, less the haze's trim at
     the two ends the edge actually has. */
  const head = Math.min((opts.head || 0) / length, 0.4);
  const tail = Math.min((opts.tail || 0) / length, 0.4);
  const keep = [];
  let cursor = head;
  for (const [lo, hi] of cuts) {
    if (lo > cursor) keep.push([cursor, Math.min(lo, 1 - tail)]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < 1 - tail) keep.push([cursor, 1 - tail]);

  const d = ramp(cam);
  const bounds = [d.split[0], d.split[1]];
  const out = [];
  for (const [s0, s1] of keep) {
    if (s1 - s0 <= 1e-4) continue;
    /* Where this span crosses a role boundary, as an s. */
    const marks = [];
    for (const edge of bounds) {
      const zEdge = cam.radius * (d.near + edge * (d.far - d.near));
      const m = (1 / zEdge - 1 / za) / (1 / zb - 1 / za);
      if (m > s0 && m < s1) marks.push(m);
    }
    marks.sort((x, y) => x - y);
    let from = s0;
    for (const m of [...marks, s1]) {
      if (m - from <= 1e-4) { from = m; continue; }
      const A = at(from);
      const B = at(m);
      const mid = (A.z + B.z) / 2;
      out.push({ a: A.p, b: B.p, z0: A.z, z1: B.z, z: mid, role: depthAt(cam, mid) });
      from = m;
    }
  }
  return out;
}

export const toPixel = (ndc, w, h) => [(ndc[0] * 0.5 + 0.5) * w, (0.5 - ndc[1] * 0.5) * h];
