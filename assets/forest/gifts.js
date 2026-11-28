/* The gifts: where the nineteen parcels stand, how big they are, and what the
   reader's browser remembers about them.

   No three in this file either. Placement is arithmetic, so the same numbers
   are available to the page, to `parcels.js` which draws them, and to
   `scripts/forest/gifts.mjs`, which checks them without a GPU. The model:

     one parcel per station, on the ground, at the foot of a small fir and
     behind its own undergrowth, 1.3 to 1.8 units off the path on a seeded
     side. Nothing is in front of a parcel that a reader needs to see, and
     nothing is drawn at a distance that would let the reader count them: the
     fog closes at 34 and the camera looks along the path, so a station shows
     its own parcel and whatever the previous station left at the edge of the
     frame.

   A parcel is a box, a lid, two ribbons with a bow, and a tag on its own
   pivot. It is closed until opened; once opened it stays open for good, and
   the state that carries across a reload is the set of slugs in localStorage,
   because a slug is what survives a reorder of the collection and a station
   index does not. */

import { height, rng, station, tangent } from './layout.js';

const GIFT_SEED = 1207;
export const STORAGE_KEY = 'superposition:forest:gifts:v1';

/* The closed parcel's footprint. `WIDTH` is the measure the separation rule is
   written against: two parcels closer than one parcel wide would read as one
   object at 320 × 240, whatever the geometry says. */
export const PAPER = { w: 0.84, h: 0.42, d: 0.6 };
export const LID = { w: 0.92, h: 0.11, d: 0.68 };
export const WIDTH = Math.hypot(PAPER.w, PAPER.d);
export const REACH = 2.4;

/* Everything that stands beside a station, derived from the station's own
   seed so that station 7 is the same parcel whether the forest is built for
   nineteen stations or twelve. */
export function placement(index) {
  const random = rng((GIFT_SEED + index * 0x9e3779b1) >>> 0);
  /* Sides alternate, so the hunt zigzags: the parcel at the reader's own stop
     is on one side of the path and the one at the next stop is on the other,
     which is what stops a corridor of boxes down the middle of the picture. */
  const side = index % 2 ? -1 : 1;
  const lateral = side * (1.5 + random() * 0.45);
  const along = (random() - 0.5) * 0.9;
  const anchor = station(index);
  const direction = tangent(index);
  const x = anchor.x - direction.z * lateral + direction.x * along;
  const z = anchor.z + direction.x * lateral + direction.z * along;

  /* The parcel's front faces the path: the tag hangs on the path side, which
     is the side the camera is on, because the camera is ahead of the bear. */
  const yaw = Math.atan2(direction.x, direction.z) + side * (Math.PI / 2) + (random() - 0.5) * 0.5;
  const scale = 0.92 + random() * 0.16;

  /* The fir behind it. `back` is measured from the parcel outward along the
     same lateral, so the trunk is never inside the box and the box is never
     inside the trunk, whatever the seed picks. */
  const back = 0.78 + random() * 0.26;
  const outward = Math.sign(lateral) * (Math.abs(lateral) + back);
  const trunkX = anchor.x - direction.z * outward + direction.x * along;
  const trunkZ = anchor.z + direction.x * outward + direction.z * along;

  /* Undergrowth: two or three tufts, and on half the stations one of them sits
     on the path side, so the parcel is found past it rather than displayed. */
  const ferns = [];
  const tufts = 2 + (random() < 0.45 ? 1 : 0);
  const covered = random() < 0.5;
  for (let i = 0; i < tufts; i += 1) {
    const angle = (i / tufts) * Math.PI * 2 + random() * 0.7 + (covered ? Math.PI : 0);
    const radius = 0.42 + random() * 0.24;
    const fx = x + Math.cos(angle) * radius;
    const fz = z + Math.sin(angle) * radius;
    ferns.push({
      x: fx,
      z: fz,
      y: height(fx, fz),
      yaw: angle + Math.PI,
      scale: 0.75 + random() * 0.5,
    });
  }

  return {
    index,
    x,
    z,
    y: height(x, z),
    yaw,
    side,
    lateral,
    along,
    scale,
    tree: { x: trunkX, z: trunkZ, y: height(trunkX, trunkZ) },
    ferns,
  };
}

export const placements = (count) => Array.from({ length: count }, (_, i) => placement(i));

/* A slug per station, read off the page's own list rather than stored here:
   the DOM is the record of which repository sits at which station. */
function remember(raw) {
  const opened = new Set();
  if (!raw) return opened;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.opened)) {
      for (const slug of parsed.opened) if (typeof slug === 'string') opened.add(slug);
    }
  } catch {
    // A value from another version of the page is not an error: it is nothing.
  }
  return opened;
}

const serialise = (opened) => JSON.stringify({ opened: [...opened].sort() });

/* localStorage is a convenience, never a requirement: a browser that refuses
   it (private mode, a policy, no storage at all) loses the memory between
   visits and nothing else. */
export function load(storage) {
  try {
    return remember(storage?.getItem(STORAGE_KEY));
  } catch {
    return new Set();
  }
}

export function save(storage, opened) {
  try {
    storage?.setItem(STORAGE_KEY, serialise(opened));
  } catch {
    // Full or forbidden: the page still works, the parcel just forgets.
  }
}
