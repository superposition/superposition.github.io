/* The three primitives the scene is built from, so that the bear and the forest
   are the same kind of object: numbers in, triangle arrays out.

   Everything here is deliberately small. `merge` is the whole reason the scene
   renders in fourteen draw calls — a hundred-odd primitives become one mesh per
   thing that moves — and it is twenty lines rather than an addon, because the
   addon would be a second vendored module to licence and review for one
   function. */

import { BufferAttribute, BufferGeometry } from 'three';

export const ZERO = [0, 0, 0];

/* A token times a factor. Every shade in the scene is one of these, so a colour
   is always the palette's own hue at another value and never a new hex. */
export const shade = (color, factor) => color.clone().multiplyScalar(factor);

/* A flat quad facing +z: two triangles where a box would cost twelve. */
export function quad(w, h) {
  const x = w / 2;
  const y = h / 2;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([
    -x, -y, 0, x, -y, 0, x, y, 0,
    -x, -y, 0, x, y, 0, -x, y, 0,
  ]), 3));
  return geometry;
}

/* A tuft of fur: one triangle pointing down, which is all a fur break costs.
   The bear uses these at a fixed pitch — the neck, the belly line — because a
   row of them at the same spacing is what tells a reader how big the animal is
   (a big thing has big fur). One triangle, not a box: at 320 × 240 a single
   flat wedge already reads as a tuft, and a row of six is six triangles. */
export function tuft(w, h) {
  const x = w / 2;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([
    -x, 0, 0, x, 0, 0, 0, -h, 0,
  ]), 3));
  return geometry;
}

/* An oval in the plane of its own face, as a fan of `sides` triangles. Six
   sides is the cheapest oval that still reads as round at twice the
   framebuffer's size, which is where the eyes are looked at. */
export function oval(rx, ry, sides = 6) {
  const position = [];
  for (let i = 0; i < sides; i += 1) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / 2;
    const b = ((i + 1) / sides) * Math.PI * 2 + Math.PI / 2;
    position.push(0, 0, 0);
    position.push(Math.cos(a) * rx, Math.sin(a) * ry, 0);
    position.push(Math.cos(b) * rx, Math.sin(b) * ry, 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(position), 3));
  return geometry;
}

/* A point on the surface of an ellipsoid, by bearing (yaw about +y, then
   pitch), so an eye can be laid on the skull's own curve instead of floating
   in front of it. */
export function onEllipsoid(rx, ry, rz, yaw, pitch) {
  return [
    rx * Math.sin(yaw) * Math.cos(pitch),
    ry * Math.sin(pitch),
    rz * Math.cos(yaw) * Math.cos(pitch),
  ];
}

/* Value roles, painted per triangle rather than per primitive, so one sphere
   can carry its near face, its mid face and its far edge without a second
   mesh: three tones in the order the camera sees them, which is the flat-shaded
   way of drawing an animal out of three values instead of one.

   `where` is the second kind of paint: a test on the triangle's centroid that
   returns a colour directly. That is how the belly patch is a marking cut out
   of the torso's own facets rather than a quad floating in front of it — the
   patch is on the surface because it is part of the surface. */
export function paint(geometry, colours, {
  centre = ZERO, axis = [0, 0, 1], edges = [0.34, -0.26], where = null,
} = {}) {
  const position = geometry.attributes.position;
  const count = position.count;
  const color = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 3) {
    const cx = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3 - centre[0];
    const cy = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3 - centre[1];
    const cz = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3 - centre[2];
    let c = where ? where(cx, cy, cz) : null;
    if (!c) {
      const len = Math.hypot(cx, cy, cz) || 1;
      const facing = (cx * axis[0] + cy * axis[1] + cz * axis[2]) / len;
      c = facing > edges[0] ? colours[0] : facing > edges[1] ? colours[1] : colours[2];
    }
    for (let k = 0; k < 3; k += 1) {
      const at = (i + k) * 3;
      color[at] = c.r; color[at + 1] = c.g; color[at + 2] = c.b;
    }
  }
  geometry.setAttribute('color', new BufferAttribute(color, 3));
  return geometry;
}

/* A box becomes a limb by scaling its cross-section along its own height. `k`
   is the width at the top as a factor of the width at the bottom: k > 1 narrows
   downward, k < 1 narrows upward. */
function taperXZ(geometry, k) {
  const position = geometry.attributes.position;
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i < position.count; i += 1) {
    const y = position.getY(i);
    low = Math.min(low, y);
    high = Math.max(high, y);
  }
  const span = high - low || 1;
  for (let i = 0; i < position.count; i += 1) {
    const t = (position.getY(i) - low) / span;
    const factor = 1 + (k - 1) * t;
    position.setX(i, position.getX(i) * factor);
    position.setZ(i, position.getZ(i) * factor);
  }
  return geometry;
}

/* One primitive, placed: scale, then rotate about each axis in x, y, z order,
   then translate. Returns the geometry with the colour it is to be drawn in. */
export function shape(geometry, color, { at = ZERO, rot = ZERO, scale = [1, 1, 1], taper = 0 } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  if (taper) taperXZ(g, taper);
  g.scale(scale[0], scale[1], scale[2]);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(at[0], at[1], at[2]);
  return { g, color };
}

/* Several placed primitives into one flat-shaded geometry with the colour in
   the vertex attribute, so one material draws all of them. A primitive that
   brought its own per-triangle colours (see `paint`) keeps them; anything else
   is filled flat with the colour it was given. */
export function merge(shapes) {
  let count = 0;
  for (const s of shapes) count += s.g.attributes.position.count;
  const position = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  let offset = 0;
  for (const s of shapes) {
    const p = s.g.attributes.position;
    position.set(p.array, 0 + offset);
    const painted = s.g.attributes.color;
    const c = s.color;
    for (let i = 0; i < p.count; i += 1) {
      const at = offset + i * 3;
      if (painted) {
        color[at] = painted.getX(i); color[at + 1] = painted.getY(i); color[at + 2] = painted.getZ(i);
      } else {
        color[at] = c.r; color[at + 1] = c.g; color[at + 2] = c.b;
      }
    }
    offset += p.count * 3;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('color', new BufferAttribute(color, 3));
  geometry.computeVertexNormals();
  return geometry;
}
