/* The forest: a faceted floor, twenty-four firs, six rocks, one path, and
   twenty stations along it — one per repository.

   Seeded and deterministic. Every tree, every rock and every facet of the
   ground comes out of `rng(SEED)`, so the same numbers are in the same places
   on every load and the picture is reviewable from a commit: change the seed
   and the whole forest moves; change nothing and it is identical.

   The floor is 16 × 16 cells of 4.5 units, two triangles a cell, flat shaded,
   with the colour jittered per facet. That jitter is doing the work a texture
   would do on better hardware: at 320 × 240 a facet that is a shade off its
   neighbour reads as ground, and a facet in one shade reads as a plane. */

import {
  BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry,
  Group, IcosahedronGeometry, Mesh, MeshLambertMaterial,
} from 'three';

import { merge, shade, shape } from './mesh.js';

export const SEED = 94;
const CELL = 5;
const COLS = 14;
const ROWS = 20;
const X0 = -35;
const Z0 = 25;
const STATION_GAP = 2.4;

/* The path runs from z = -4 to z = -72; the floor has to reach past both ends
   of it, or the bear walks off the edge of the world at the tenth station. */
const Z_FAR = Z0 - ROWS * CELL;

/* mulberry32. Eight lines, no dependency, and the same sequence every run. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The ground. A gentle rise: two long swells across the floor and a climb with
   distance, so the path walks uphill into the fog and the far edge is never a
   horizon line. */
export const height = (x, z) => (
  0.58 * Math.sin(x * 0.13) * Math.cos(z * 0.11)
  + 0.3 * Math.sin(x * 0.29 + z * 0.21)
  + z * 0.018
);

/* Where the bear stands for repository `index`. The path curves, so a station
   is a point on a curve rather than a step along an axis, and the hop has a
   direction the bear can face. */
export function station(index) {
  const z = -4 - index * STATION_GAP;
  const x = 2.9 * Math.sin(index * 0.42 + 0.4) + 0.8 * Math.sin(index * 0.17);
  return { x, y: height(x, z), z };
}

const tangent = (index) => {
  const a = station(index - 1);
  const b = station(index + 1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
};

export const facing = (index) => Math.atan2(tangent(index).x, tangent(index).z);

/* Distance from a point to the path, sampled: enough to keep trees out of the
   walk without an exact curve distance. */
function distanceToPath(x, z) {
  let best = Infinity;
  for (let i = 0; i < 20; i += 1) {
    const s = station(i);
    best = Math.min(best, Math.hypot(s.x - x, s.z - z));
  }
  return best;
}

function facetFloor(palette, random) {
  const ground = new Color(palette.dust).multiplyScalar(0.13);
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

function fir(random, palette) {
  const trunk = new Color(palette.deep).multiplyScalar(0.7);
  const needle = shade(new Color(palette.dust), 0.26 + random() * 0.12);
  const needleTop = shade(needle, 1.18);
  const h = 4.6 + random() * 2.6;
  return [
    shape(new CylinderGeometry(0.09, 0.14, h * 0.42, 4), trunk, { at: [0, h * 0.21, 0] }),
    shape(new ConeGeometry(h * 0.46, h * 0.62, 6), needle, { at: [0, h * 0.5, 0] }),
    shape(new ConeGeometry(h * 0.32, h * 0.5, 6), needleTop, { at: [0, h * 0.82, 0] }),
  ];
}

export function createForest(palette) {
  const random = rng(SEED);
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const root = new Group();

  root.add(new Mesh(facetFloor(palette, random), material));

  /* Twenty-four firs, one for most stations and two for four of them, placed
     along the path rather than scattered at random: a corridor of trees is what
     makes the picture a forest, and a seeded scatter over a hundred units puts
     three trees in frame and twenty-one behind the camera. The side, the
     distance from the path and the position along it are all the seed's. */
  const trees = [];
  for (let i = -8; i < 16; i += 1) {
    const anchor = station(i);
    const direction = tangent(i);
    const side = random() < 0.5 ? -1 : 1;
    const lateral = side * (5.4 + random() * 5.4);
    const along = (random() - 0.5) * 3.4;
    const x = anchor.x - direction.z * lateral + direction.x * along;
    const z = anchor.z + direction.x * lateral + direction.z * along;
    const y = height(x, z);
    for (const part of fir(random, palette)) {
      part.g.translate(x, y, z);
      trees.push(part);
    }
  }
  root.add(new Mesh(merge(trees), material));

  /* Six rocks, nearer the path than the trees, so the ground has something on
     it at the distance a reader actually looks. */
  const rocks = [];
  const stone = shade(new Color(palette.dust), 0.22);
  for (let i = 0; i < 6; i += 1) {
    const at = 2 + i * 3;
    const anchor = station(at);
    const direction = tangent(i);
    const side = i % 2 ? 1 : -1;
    const lateral = side * (2.6 + random() * 1.8);
    const x = anchor.x - direction.z * lateral;
    const z = anchor.z + direction.x * lateral + (random() - 0.5) * 2;
    const r = 0.3 + random() * 0.42;
    rocks.push(shape(new IcosahedronGeometry(r, 0), shade(stone, 0.8 + random() * 0.5), {
      at: [x, height(x, z) + r * 0.28, z], scale: [1.2, 0.72, 1.1], rot: [0, random() * 3, 0],
    }));
  }
  root.add(new Mesh(merge(rocks), material));

  // The path: a ribbon sampled along the station curve, laid a hair above the
  // ground so it never z-fights with the facet it lies on.
  const path = [];
  const pathColor = shade(new Color(palette.cream), 0.16);
  const half = 0.85;
  for (let i = 0; i < 20; i += 1) {
    for (let s = 0; s < 6; s += 1) {
      const a = i + s / 6;
      const b = i + (s + 1) / 6;
      const pointAt = (u) => {
        const base = Math.floor(u);
        const k = u - base;
        const p0 = station(Math.min(19, base));
        const p1 = station(Math.min(19, base + 1));
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
      const quad = [
        { x: p0.x - nx, y: p0.y, z: p0.z - nz },
        { x: p0.x + nx, y: p0.y, z: p0.z + nz },
        { x: p1.x + nx, y: p1.y, z: p1.z + nz },
        { x: p1.x - nx, y: p1.y, z: p1.z - nz },
      ];
      path.push({ g: quadGeometry([quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]]), color: pathColor });
    }
  }
  root.add(new Mesh(merge(path), material));

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
