/* One seeded random stream, shared by the generator and the scene.

   Every placement on the map that is not content — the jitter on a ring's
   angle, a star's position, a nebula blob's radius — comes out of this file, so
   the committed SVG, the WebGL frame and a re-run of `scripts/scene/map.mjs`
   all agree. `Math.imul` keeps it to 32-bit integer arithmetic, which is exact
   in every engine, so the same seed is the same sky on every machine.

   mulberry32: public domain, one 32-bit word of state. */

export function rng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A repository's jitter follows its slug, not its position in the file, so
   adding a twenty-first repository does not move the other twenty. */
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/* Signed jitter in [-a, a] from a stream. */
export const jitter = (next, a) => (next() * 2 - 1) * a;
