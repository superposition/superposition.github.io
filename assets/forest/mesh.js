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
   the vertex attribute, so one material draws all of them. */
export function merge(shapes) {
  let count = 0;
  for (const s of shapes) count += s.g.attributes.position.count;
  const position = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  let offset = 0;
  for (const s of shapes) {
    const p = s.g.attributes.position;
    position.set(p.array, 0 + offset);
    const c = s.color;
    for (let i = 0; i < p.count; i += 1) {
      const at = offset + i * 3;
      color[at] = c.r;
      color[at + 1] = c.g;
      color[at + 2] = c.b;
    }
    offset += p.count * 3;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(position, 3));
  geometry.setAttribute('color', new BufferAttribute(color, 3));
  geometry.computeVertexNormals();
  return geometry;
}
