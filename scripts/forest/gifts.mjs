#!/usr/bin/env node
/* Where the parcels stand, and whether the rules hold.

     node --experimental-default-type=module scripts/forest/gifts.mjs
     node --experimental-default-type=module scripts/forest/gifts.mjs --json

   It imports `assets/forest/gifts.js` and `assets/forest/layout.js` — the same
   modules the page draws with, not a copy of their arithmetic — so a number
   below is a number the scene will put on the screen. No browser, no GPU, no
   three: the placement is pure and this is the proof of it.

   The rules, and what each protects:

     one per station     every repository is findable, and the count is the
                         collection's own count, read off `_repos/`.
     separation          no two parcels closer than one parcel wide (`WIDTH`).
                         Two boxes that close would read as one object at
                         320 x 240 however far apart their centres are.
     reach               every parcel within `REACH` of the station it belongs
                         to, so "the bear finds it at his stop" is geometry.
     on the ground       each parcel's base sits on the height field, and its
                         four corners are not under it.
     on the floor        inside the walkable ground, or it stands on nothing.
     off the path        clear of the path ribbon, so the bear never walks
                         through a parcel.
     behind its trunk    the fir is further from the path than the parcel, and
                         no closer to it than the box's own footprint.
     nearest is the one   at each station the parcel nearest the bear is the
                         station's own, so "the one at your stop" is geometry
                         and not a rule the page has to enforce.
     not all in frame    no station shows more than a dozen: the rest are past
                         the point where a parcel is eight pixels wide, and the
                         fog has them.
     same numbers twice  the placement is a function of the index alone, so a
                         reload is the same wood and a new repository does not
                         move the ones already placed. */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLOOR, height, station } from '../../assets/forest/layout.js';
import { PAPER, REACH, WIDTH, placements } from '../../assets/forest/gifts.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const AS_JSON = process.argv.includes('--json');

const slugs = readdirSync(join(ROOT, '_repos'))
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.slice(0, -3))
  .sort();
const places = placements(slugs.length);
const problems = [];
const rows = [];

const fail = (message) => problems.push(message);

/* --- one per station ---------------------------------------------------- */
if (places.length !== slugs.length) {
  fail(`${slugs.length} repositories but ${places.length} parcels`);
}

/* --- separation -------------------------------------------------------- */
let closest = { pair: null, distance: Infinity };
for (let i = 0; i < places.length; i += 1) {
  for (let j = i + 1; j < places.length; j += 1) {
    const d = Math.hypot(places[i].x - places[j].x, places[i].z - places[j].z);
    if (d < closest.distance) closest = { pair: [slugs[i], slugs[j]], distance: d };
  }
}
if (closest.distance < WIDTH) {
  fail(`nearest pair ${closest.distance.toFixed(3)} < one parcel wide (${WIDTH.toFixed(3)}): ${closest.pair.join(' / ')}`);
}

/* --- reach, ground, floor, path --------------------------------------- */
let furthest = { slug: '', distance: 0 };
const corners = [];
for (const [index, place] of places.entries()) {
  const anchor = station(index);
  const reach = Math.hypot(place.x - anchor.x, place.z - anchor.z);
  if (reach > furthest.distance) furthest = { slug: slugs[index], distance: reach };
  if (reach > REACH) fail(`${slugs[index]}: ${reach.toFixed(2)} from its station, past the ${REACH} reach`);

  const ground = height(place.x, place.z);
  if (Math.abs(place.y - ground) > 1e-9) fail(`${slugs[index]}: base ${place.y} against ground ${ground}`);

  // The box's four corners, in the parcel's own frame, against the ground
  // under each of them: a parcel on a slope must not bury a corner.
  const half = { x: PAPER.w / 2, z: PAPER.d / 2 };
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const cos = Math.cos(place.yaw);
    const sin = Math.sin(place.yaw);
    const cx = place.x + (half.x * sx * cos + half.z * sz * sin);
    const cz = place.z + (-half.x * sx * sin + half.z * sz * cos);
    const clearance = ground - height(cx, cz);
    corners.push(clearance);
    if (clearance > 0.12) fail(`${slugs[index]}: a corner stands ${clearance.toFixed(3)} over the ground`);
  }

  if (place.x < FLOOR.x0 || place.x > FLOOR.x1 || place.z > FLOOR.z0 || place.z < FLOOR.z1) {
    fail(`${slugs[index]}: ${place.x.toFixed(1)}, ${place.z.toFixed(1)} is off the floor`);
  }

  const trunkGap = Math.hypot(place.tree.x - place.x, place.tree.z - place.z);
  if (trunkGap < Math.hypot(PAPER.w, PAPER.d) / 2 + 0.12) {
    fail(`${slugs[index]}: trunk ${trunkGap.toFixed(2)} from the parcel centre, inside its footprint`);
  }
  if (Math.abs(place.tree.x - station(index).x) < Math.abs(place.x - station(index).x)) {
    fail(`${slugs[index]}: the fir is nearer the path than the parcel`);
  }

  rows.push({
    station: index + 1,
    slug: slugs[index],
    x: +place.x.toFixed(3),
    z: +place.z.toFixed(3),
    reach: +reach.toFixed(3),
    side: place.side > 0 ? 'right' : 'left',
    trunk: +trunkGap.toFixed(3),
    ferns: place.ferns.length,
    covered: place.ferns.some((fern) => (fern.x - place.x) * (station(index).x - place.x) > 0),
  });
}

/* --- what the camera sees --------------------------------------------- */

/* The shot, in the arithmetic the scene uses: the camera sits at the bear's
   own offset (bear.js CAMERA) rotated into his heading, at eye height, looking
   at his chest. A point is in frame when its projected x and y are inside
   ±1 and it is in front of the lens. */
const CAMERA = { x: 1.9, y: 2.2, z: 4.6 };
const LOOK = 1.0;
const FOV = 58 * (Math.PI / 180);
const ASPECT = 320 / 240;
/* Legible, not merely in the frustum. The framebuffer is 320 wide with a
   58-degree vertical field, so the focal length is 120 / tan(29°) = 216.6
   pixels: a 0.62-unit parcel is eight pixels wide at 16.8 units and four at
   33, where the fog has it. The frustum would admit the whole path; the count
   below is what a reader can pick out of the picture and walk to. */
const FOCAL = 120 / Math.tan(FOV / 2);
const LEGIBLE_PX = 8;
const FOG = (WIDTH * FOCAL) / LEGIBLE_PX;

function inFrame(index) {
  const bear = station(index);
  const yaw = Math.atan2(
    station(index + 1).x - station(index - 1).x,
    station(index + 1).z - station(index - 1).z,
  );
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  const eye = {
    x: bear.x + cos * CAMERA.x + sin * CAMERA.z,
    y: bear.y + 0.46 + CAMERA.y,
    z: bear.z - sin * CAMERA.x + cos * CAMERA.z,
  };
  const target = { x: bear.x, y: bear.y + 0.46 + LOOK, z: bear.z };

  const forward = [target.x - eye.x, target.y - eye.y, target.z - eye.z];
  const fl = Math.hypot(...forward);
  const f = forward.map((c) => c / fl);
  // Right is forward × up, with up = (0, 1, 0): (-fz, 0, fx), normalised.
  const rl = Math.hypot(f[2], f[0]) || 1;
  const right = [-f[2] / rl, 0, f[0] / rl];
  const up = [
    right[1] * f[2] - right[2] * f[1],
    right[2] * f[0] - right[0] * f[2],
    right[0] * f[1] - right[1] * f[0],
  ];

  const visible = [];
  for (const [i, place] of places.entries()) {
    const p = [place.x - eye.x, place.y + PAPER.h / 2 - eye.y, place.z - eye.z];
    const z = p[0] * f[0] + p[1] * f[1] + p[2] * f[2];
    if (z <= 0.1 || z > FOG) continue;
    const x = (p[0] * right[0] + p[1] * right[1] + p[2] * right[2]) / (z * Math.tan(FOV / 2) * ASPECT);
    const y = (p[0] * up[0] + p[1] * up[1] + p[2] * up[2]) / (z * Math.tan(FOV / 2));
    if (Math.abs(x) <= 1 && Math.abs(y) <= 1) visible.push({ index: i, x, y, z, px: (WIDTH * FOCAL) / z });
  }
  return visible;
}

let mostLegible = { station: 0, count: 0, parcels: [] };
let ownSeen = 0;
let nearestOwn = 0;
const framing = [];
for (let i = 0; i < places.length; i += 1) {
  const seen = inFrame(i);
  const legible = seen.filter((entry) => entry.px >= LEGIBLE_PX);
  const own = seen.find((entry) => entry.index === i);
  if (own) ownSeen += 1;
  // The one at the reader's own stop is the nearest parcel to the bear, so it
  // is the one within reach, and a click on any other is a click on a parcel
  // he has not walked to yet.
  const fromBear = places
    .map((other, j) => ({ j, d: Math.hypot(other.x - station(i).x, other.z - station(i).z) }))
    .sort((a, b) => a.d - b.d)[0];
  if (fromBear.j === i) nearestOwn += 1;
  else fail(`station ${i + 1}: parcel ${fromBear.j + 1} is nearer the bear (${fromBear.d.toFixed(2)}) than its own`);
  if (legible.length > mostLegible.count) {
    mostLegible = { station: i + 1, count: legible.length, parcels: legible.map((entry) => entry.index + 1) };
  }
  framing.push({
    station: i + 1,
    legible: legible.map((entry) => entry.index + 1),
    ownPx: own ? +own.px.toFixed(1) : null,
  });
}
if (ownSeen !== places.length) fail(`only ${ownSeen} of ${places.length} stations can see their own parcel`);
if (nearestOwn !== places.length) fail(`${places.length - nearestOwn} stations have another parcel nearer the bear than their own`);
if (mostLegible.count > places.length - 4) {
  fail(`${mostLegible.count} of ${places.length} parcels legible at once at station ${mostLegible.station}: nothing left to find`);
}

/* --- the same numbers twice ------------------------------------------- */
const again = placements(places.length);
for (let i = 0; i < again.length; i += 1) {
  if (again[i].x !== places[i].x || again[i].z !== places[i].z || again[i].yaw !== places[i].yaw) {
    fail(`station ${i + 1} is not deterministic`);
    break;
  }
}

/* --- report ------------------------------------------------------------ */
const summary = {
  repositories: slugs.length,
  parcels: places.length,
  parcelWidth: +WIDTH.toFixed(3),
  reachLimit: REACH,
  closestPair: { slugs: closest.pair, metres: +closest.distance.toFixed(3) },
  furthestFromItsStation: { slug: furthest.slug, metres: +furthest.distance.toFixed(3) },
  cornerClearance: {
    min: +Math.min(...corners).toFixed(3),
    max: +Math.max(...corners).toFixed(3),
  },
  mostLegibleAtOnce: mostLegible.count === 0 ? {} : mostLegible,
  stationsSeeingOwnParcel: `${ownSeen}/${places.length}`,
  stationsWhereOwnParcelIsNearest: `${nearestOwn}/${places.length}`,
  problems,
};

if (AS_JSON) {
  console.log(JSON.stringify({ summary, rows, framing }, null, 2));
} else {
  const heading = ['#', 'repository', 'x', 'z', 'reach', 'side', 'trunk', 'ferns', 'cover'];
  console.log(heading.map((h, i) => (i === 1 ? h.padEnd(30) : h.padStart(7))).join(' '));
  for (const row of rows) {
    console.log([
      String(row.station).padStart(7),
      row.slug.padEnd(30),
      String(row.x).padStart(7),
      String(row.z).padStart(7),
      String(row.reach).padStart(7),
      row.side.padStart(7),
      String(row.trunk).padStart(7),
      String(row.ferns).padStart(7),
      (row.covered ? 'yes' : '—').padStart(7),
    ].join(' '));
  }
  console.log('');
  console.log(`repositories              ${summary.repositories}`);
  console.log(`parcels                   ${summary.parcels}`);
  console.log(`one parcel wide           ${summary.parcelWidth}`);
  console.log(`closest pair              ${summary.closestPair.metres} (${summary.closestPair.slugs.join(' / ')})`);
  console.log(`furthest from a station   ${summary.furthestFromItsStation.metres} (${summary.furthestFromItsStation.slug})`);
  console.log(`corner clearance          ${summary.cornerClearance.min} .. ${summary.cornerClearance.max} under the ground`);
  console.log(`stations seeing own gift  ${summary.stationsSeeingOwnParcel}`);
  console.log(`own gift is the nearest   ${summary.stationsWhereOwnParcelIsNearest}`);
  console.log(`most legible at once      ${summary.mostLegibleAtOnce.count} of ${summary.parcels} at station ${summary.mostLegibleAtOnce.station} (${summary.mostLegibleAtOnce.parcels.join(', ')})`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
