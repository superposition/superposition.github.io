/* The camera, and the one projection both renderers use.

   The scene is composed in a 1.82 : 1 box -- the home hero's own ratio at a
   1440 x 900 window -- and the box keeps its width at every other window shape:
   the frame's width is the box's width and the height follows. A phone
   therefore shows the whole plate, smaller, rather than a crop of its middle.
   That is the one rule, written here, and the SVG obeys it with
   `preserveAspectRatio="xMidYMid meet"` on the same 1820 x 1000 viewBox -- the
   frame's remaining black is the page's own ground, so nothing looks letterboxed
   and the canvas and the still land on the same pixels at every window shape. */

export const ASPECT = 1.82;
const DEG = Math.PI / 180;

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
   the camera that the stroke fade is read from. */
export function project(v, aspect, p) {
  const sc = scales(v, aspect);
  const d = sub(p, v.eye);
  const zc = -dot(d, v.z);
  if (zc <= 0.05) return null;
  return [dot(d, v.x) / (zc * sc.tanX), dot(d, v.y) / (zc * sc.tanY), zc];
}

/* Depth fade: what a stroke keeps of its opacity as it recedes. The reference
   is the composed distance to the target, so the numbers do not change when a
   page picks a different orbit radius. */
export function fade(cam, distance) {
  const ref = cam.radius;
  const f = cam.fade;
  const t = (distance - ref * f.near) / (ref * (f.far - f.near));
  return Math.max(f.floor, Math.min(1, 1 - t * (1 - f.floor)));
}

export const toPixel = (ndc, w, h) => [(ndc[0] * 0.5 + 0.5) * w, (0.5 - ndc[1] * 0.5) * h];
