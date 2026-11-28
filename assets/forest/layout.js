/* Where everything in the forest stands, as arithmetic and nothing else.

   This file is deliberately free of three: `forest.js` draws with it,
   `gifts.js` places parcels with it, and `scripts/forest/gifts.mjs` checks the
   result in Node without a renderer, a browser or a GPU. One seed, one height
   field and one curve, so a parcel the script says is 1.6 units off the path is
   the parcel the page draws in that place.

   The path is a curve rather than a line because a station is a place the bear
   stands and faces along the path; a straight march would make every hop the
   same hop and every faceted tree the same tree. */

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

export const STATION_GAP = 2.4;

/* The floor, which is also the edge of the world: nothing walkable exists
   outside it, so a parcel placed outside it would float over nothing. */
export const FLOOR = { x0: -35, x1: 35, z0: 25, z1: -75 };

/* Where the bear stands for repository `index`. The path curves, so a station
   is a point on a curve rather than a step along an axis, and the hop has a
   direction the bear can face. */
export function station(index) {
  const z = -4 - index * STATION_GAP;
  const x = 2.9 * Math.sin(index * 0.42 + 0.4) + 0.8 * Math.sin(index * 0.17);
  return { x, y: height(x, z), z };
}

export function tangent(index) {
  const a = station(index - 1);
  const b = station(index + 1);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) || 1;
  return { x: dx / length, z: dz / length };
}

export const facing = (index) => Math.atan2(tangent(index).x, tangent(index).z);

/* A point off the path at station `index`: `lateral` along the path's normal,
   `along` up or down the path. One function for parcels, ferns and the trees
   that stand at their stations, so "1.6 units from the path" means the same
   thing to all three. */
export function beside(index, lateral, along = 0) {
  const anchor = station(index);
  const direction = tangent(index);
  const x = anchor.x - direction.z * lateral + direction.x * along;
  const z = anchor.z + direction.x * lateral + direction.z * along;
  return { x, z, y: height(x, z) };
}

/* Distance from a point to the path, sampled at every station: enough to keep
   trees out of the walk without an exact curve distance. */
export function distanceToPath(x, z, count) {
  let best = Infinity;
  for (let i = 0; i < count; i += 1) {
    const s = station(i);
    best = Math.min(best, Math.hypot(s.x - x, s.z - z));
  }
  return best;
}
