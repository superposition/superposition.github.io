/* The forest: a faceted floor, the trees that stand at every station, one
   undergrowth tuft per parcel, six rocks, one path.

   Seeded and deterministic. Every tree, every rock and every facet of the
   ground comes out of `rng`, so the same numbers are in the same places on
   every load and the picture is reviewable from a commit: change the seed and
   the whole forest moves; change nothing and it is identical.

   The floor is 16 × 16 cells of 4.5 units, two triangles a cell, flat shaded,
   with the colour jittered per facet. That jitter is doing the work a texture
   would do on better hardware: at 320 × 240 a facet that is a shade off its
   neighbour reads as ground, and a facet in one shade reads as a plane.

   Colour: the floor and the trees are the garden's own leaf green at four
   values, the trunks are the palette's brown and the path is bare earth, so
   the wood is green and brown and the only warm thing in it is the gift. Every
   colour is a token times a factor — there is no hex in this file — and the
   values are read back out of the framebuffer by `scripts/forest/measure.mjs`,
   so a claim about the light is a measurement rather than a taste. */

import {
  BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry,
  Group, IcosahedronGeometry, Mesh, MeshLambertMaterial,
} from 'three';

import { merge, quad, shade, shape } from './mesh.js';
import { FLOOR, height, rng, station, tangent } from './layout.js';

export { distanceToPath, facing, height, rng, station } from './layout.js';

export const SEED = 94;
const CELL = 5;
const COLS = 14;
const ROWS = 20;
const X0 = FLOOR.x0;
const Z0 = FLOOR.z0;

function facetFloor(palette, random) {
  /* The ground is the leaf token at a fifth of its value: the wood at night,
     not a lawn, and the value the three cases are built on. It is deliberately
     below the firs — a floor at the same value as the trees behind it flattens
     the picture into one green shape, which is what the first measurement of
     this frame showed (ground and needles both at 0.08 of white). A per-facet
     jitter of ±20 % is what stands in for a texture. */
  const ground = shade(new Color(palette.leaf), 0.2);
  const positions = [];
  const colors = [];

  const at = (ix, iz) => {
    const x = X0 + ix * CELL;
    const z = Z0 - iz * CELL;
    return { x, y: height(x, z), z };
  };

  const push = (a, b, c, tint) => {
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      colors.push(tint.r, tint.g, tint.b);
    }
  };

  for (let ix = 0; ix < COLS; ix += 1) {
    for (let iz = 0; iz < ROWS; iz += 1) {
      const a = at(ix, iz);
      const b = at(ix + 1, iz);
      const c = at(ix + 1, iz + 1);
      const d = at(ix, iz + 1);
      const tint = (n) => shade(ground, 0.82 + n * 0.4);
      // Wound so the normal points at the sky: the floor is a floor, not a lid.
      push(a, b, c, tint(random()));
      push(a, c, d, tint(random()));
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/* A fir: four-sided trunk, two six-sided cones. Eight faces at the crown is
   the cheapest cone that still reads as a conifer once the light has put one
   face in shadow, and the two stacked cones are what a tree silhouette needs
   to not be a triangle. */
function fir(random, palette, scale) {
  const trunk = shade(new Color(palette.deep), 1.6);
  const needle = shade(new Color(palette.leaf), 1.05 + random() * 0.55);
  const needleTop = shade(needle, 1.35);
  const h = (4.6 + random() * 2.6) * scale;
  return [
    shape(new CylinderGeometry(0.12 * scale, 0.19 * scale, h * 0.42, 4), trunk, { at: [0, h * 0.21, 0] }),
    shape(new ConeGeometry(h * 0.46, h * 0.62, 6), needle, { at: [0, h * 0.5, 0] }),
    shape(new ConeGeometry(h * 0.32, h * 0.5, 6), needleTop, { at: [0, h * 0.82, 0] }),
  ];
}

/* A tuft of undergrowth: three blades fanned out of one point, the brightest
   green in the frame. Three triangles, and it is the thing a parcel is found
   behind rather than beside. */
function fern(palette, at, yaw, scale) {
  const blade = new Color(palette.leaf);
  const tip = new Color(palette.spore);
  const shapes = [];
  for (let i = 0; i < 3; i += 1) {
    const rotate = yaw + (i - 1) * 0.55;
    const bladeHeight = (0.5 + i * 0.06) * scale;
    shapes.push(shape(quad(0.1 * scale, bladeHeight), shade(blade, 0.9 + i * 0.18), {
      at: [at.x, at.y + bladeHeight / 2, at.z],
      rot: [0.16, rotate, (i - 1) * 0.22],
    }));
    if (i === 1) {
      shapes.push(shape(quad(0.05 * scale, 0.06 * scale), tip, {
        at: [at.x, at.y + bladeHeight, at.z],
        rot: [0.3, rotate, 0],
      }));
    }
  }
  return shapes;
}

export function createForest(palette, places) {
  const random = rng(SEED);
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const root = new Group();
  root.name = 'forest';
  const count = places.length;

  const floor = new Mesh(facetFloor(palette, random), material);
  floor.name = 'ground';
  root.add(floor);

  /* A corridor of firs along the path: the distance from the path, the side and
     the position along it are all the seed's, so the same trees come back every
     load and a reviewer sees the frame that was measured. Four of them carry two
     trees instead of one, which is what makes the corridor read as a wood
     rather than as a fence. */
  const trees = [];
  for (let i = -8; i < count + 2; i += 1) {
    const anchor = station(i);
    const direction = tangent(i);
    const side = random() < 0.5 ? -1 : 1;
    const lateral = side * (5.4 + random() * 5.4);
    const along = (random() - 0.5) * 3.4;
    const x = anchor.x - direction.z * lateral + direction.x * along;
    const z = anchor.z + direction.x * lateral + direction.z * along;
    const y = height(x, z);
    for (const part of fir(random, palette, 1)) {
      part.g.translate(x, y, z);
      trees.push(part);
    }
  }

  /* The tree each parcel stands under, and the undergrowth around it. Both are
     the parcel's own seed (`gifts.js`), so a parcel cannot drift away from the
     trunk it was placed against — one placement, two readers. */
  for (const place of places) {
    const tree = place.tree;
    for (const part of fir(random, palette, 0.62)) {
      part.g.translate(tree.x, tree.y, tree.z);
      trees.push(part);
    }
    for (const tuft of place.ferns) {
      for (const blade of fern(palette, tuft, tuft.yaw, tuft.scale)) trees.push(blade);
    }
  }
  const firs = new Mesh(merge(trees), material);
  firs.name = 'trees';
  root.add(firs);

  /* Six rocks, nearer the path than the trees, so the ground has something on
     it at the distance a reader actually looks. */
  const rocks = [];
  const stone = shade(new Color(palette.dust), 0.22);
  for (let i = 0; i < 6; i += 1) {
    const at = 2 + i * 3;
    const anchor = station(at);
    const direction = tangent(at);
    const side = i % 2 ? 1 : -1;
    const lateral = side * (2.6 + random() * 1.8);
    const x = anchor.x - direction.z * lateral;
    const z = anchor.z + direction.x * lateral + (random() - 0.5) * 2;
    const r = 0.3 + random() * 0.42;
    rocks.push(shape(new IcosahedronGeometry(r, 0), shade(stone, 0.8 + random() * 0.5), {
      at: [x, height(x, z) + r * 0.28, z], scale: [1.2, 0.72, 1.1], rot: [0, random() * 3, 0],
    }));
  }
  const stones = new Mesh(merge(rocks), material);
  stones.name = 'rocks';
  root.add(stones);

  /* The path: a ribbon sampled along the station curve, laid a hair above the
     ground so it never z-fights with the facet it lies on. It is the one warm
     surface in the wood — bare earth through the green. */
  const path = [];
  const pathColor = shade(new Color(palette.cream), 0.17);
  const half = 0.85;
  for (let i = 0; i < count; i += 1) {
    for (let s = 0; s < 6; s += 1) {
      const a = i + s / 6;
      const b = i + (s + 1) / 6;
      const last = count - 1;
      const pointAt = (u) => {
        const base = Math.floor(u);
        const k = u - base;
        const p0 = station(Math.min(last, base));
        const p1 = station(Math.min(last, base + 1));
        const x = p0.x + (p1.x - p0.x) * k;
        const z = p0.z + (p1.z - p0.z) * k;
        return { x, y: height(x, z) + 0.025, z };
      };
      const p0 = pointAt(a);
      const p1 = pointAt(b);
      const dir = { x: p1.x - p0.x, z: p1.z - p0.z };
      const len = Math.hypot(dir.x, dir.z) || 1;
      const nx = -dir.z / len * half;
      const nz = dir.x / len * half;
      path.push({
        g: quadGeometry([
          { x: p0.x - nx, y: p0.y, z: p0.z - nz },
          { x: p0.x + nx, y: p0.y, z: p0.z + nz },
          { x: p1.x + nx, y: p1.y, z: p1.z + nz },
          { x: p1.x - nx, y: p1.y, z: p1.z - nz },
        ]),
        color: pathColor,
      });
    }
  }
  const trail = new Mesh(merge(path), material);
  trail.name = 'trail';
  root.add(trail);

  let triangles = 0;
  root.traverse((object) => {
    if (object.isMesh) triangles += object.geometry.attributes.position.count / 3;
  });

  return { root, material, triangles, trees: trees.length / 3, rocks: rocks.length };
}

function quadGeometry(points) {
  const geometry = new BufferGeometry();
  const array = new Float32Array(points.length * 3);
  points.forEach((p, i) => {
    array[i * 3] = p.x;
    array[i * 3 + 1] = p.y;
    array[i * 3 + 2] = p.z;
  });
  geometry.setAttribute('position', new BufferAttribute(array, 3));
  return geometry;
}
