#!/usr/bin/env node
/* The map's layout, its data and its still.

     node --experimental-default-type=module scripts/scene/map.mjs
     node --experimental-default-type=module scripts/scene/map.mjs --check

   One pass, two outputs and a report:

     _data/scene-map.yml     where every node sits in the world, what it is
                             called and what it links to, plus the camera
     _includes/scene/map.svg the same scene projected once, cut, lit and
                             depth-ramped, for the no-JavaScript hero

   The renderer in assets/scene/map.js reads the YAML through the page and draws
   the same geometry with the same lib/ modules, so there is one layout and two
   ways of drawing it, never two layouts. Nothing here is hand-placed: the
   positions come out of the content (a topic, the repositories filed under it,
   the unit that fronts one, the journal's arm) and out of the seed, so a
   re-run is byte-identical and a new repository moves into its topic's fan.

   The pass itself -- what makes the plate read as objects in space rather than
   as a graph diagram -- is four rules, all of them computed:

     occlusion  a nearer form's silhouette hides the edge behind it, and an
                edge stops at the silhouette of the form it lands on. The cut
                is `span()` in lib/camera.js, so the canvas cuts it in the same
                place. Nothing is faked with a darker stroke.
     depth      every stroke takes the value of the depth role it sits in
                (`DEPTH` in lib/camera.js): highlight, near, mid, far, with a
                step between the roles and pure light spent on the nearest
                sliver only. An edge is cut where it crosses a role boundary,
                so it steps down as it recedes instead of being evenly dimmed,
                and the haze lifts its pen at the far end.
     light      one azimuth, in lib/forms.js. Every form segment is lit or in
                shadow by its own outward normal, so a diamond has two faces
                and a triangle loses its base.
     grid       every label's baseline sits on `LABEL_GRID`'s rows.

   The report is the gate. It fails the run, with a non-zero exit, when

     * a node would leave the frame at any pose the camera can reach,
     * a node would fall into the band the hero's type occupies,
     * two forms would overlap, or two labels would,
     * an edge names a node that is not there,
     * an edge sample falls inside a nearer diamond and still has ink on it,
     * a label's baseline is off its row, or a label leaves the frame,
     * a form has no lit face or no shadowed one.

   Checked at 1440 and at 420, because the plate is the same plate at both and
   the type band is not. `--check` writes nothing: it exits 1 when either
   committed file differs from what this seed draws. */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rng, seedOf, jitter } from '../../assets/scene/lib/seeded.js';
import {
  ASPECT,
  DEPTH,
  HAZE,
  state,
  view,
  scales,
  project,
  depthAt,
  valueAt,
  pieces,
  unproject,
  toPixel,
} from '../../assets/scene/lib/camera.js';
import { form, place, hull, faceOf, normalOf, run, dash, RUNG, DASH, LABEL_GRID, labelRow } from '../../assets/scene/lib/forms.js';
import { stars, blobs, falloff } from '../../assets/scene/lib/field.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_YAML = join(ROOT, '_data', 'scene-map.yml');
const OUT_SVG = join(ROOT, '_includes', 'scene', 'map.svg');

/* ------------------------------------------------------------------ config */

const SEED = 1977;
const CHECK = process.argv.includes('--check');

const E = process.env;
let CAMERA = {
  fov: +(E.FOV || 26),
  aspect: ASPECT,
  radius: +(E.RAD || 9.0),
  target: [-(E.TX || 0.05), -(E.TY || 0.43), 0],
  elevation: +(E.ELEV || 19),
  azimuth: 0,
  yaw: 4.5,
  pitch: 1.5,
  dolly: [1, 1.14],
  depth: DEPTH,
};

/* The band the hero's type stands in, in normalised device coordinates. The
   layouts of the two lines are the shape of index.html's hero: at 1440 the
   headline's cap line sits at y 0.033, at 420 the block starts higher because
   the type is smaller, and the statement, its Hold switch and the topic line
   fill everything below. A node -- and its label -- keeps out of both. */
const TYPE_BAND = { 1.82: 0.02, PORTRAIT: -0.12 };

/* Nothing may sit closer than this to the frame edge. */
const MARGIN = 0.035;

/* Where the plate's mass sits across the frame: left of centre, so the right
   of the frame carries the deliberate empty the journal's arm crosses. */
const AXIS = -0.07;

const SIZES = {
  datum: 0.32,
  topic: 0.19,
  repo: 0.078,
  unit: 0.1,
  journal: 0.16,
};

/* The arm off the frame: the open edge past the journal's bracket continues to
   the frame's edge and through it. The one line on the plate with no form at
   its end, because there is nothing on the other end of a journal yet. */
const CROP = { reach: 2.2 };

/* --------------------------------------------------------------- the content */

const readText = (p) => readFileSync(p, 'utf8');

function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const topics = () => {
  const out = [];
  for (const line of readText(join(ROOT, '_data', 'topics.yml')).split(/\r?\n/)) {
    const slug = line.match(/^\s*-\s*slug:\s*(.+)$/);
    const name = line.match(/^\s*name:\s*(.+)$/);
    if (slug) out.push({ slug: slug[1].trim(), name: '' });
    else if (name && out.length) out[out.length - 1].name = name[1].replace(/^["']|["']$/g, '').trim();
  }
  return out;
};

const repos = () =>
  readdirSync(join(ROOT, '_repos'))
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const fm = frontMatter(readText(join(ROOT, '_repos', file)));
      const slug = fm.slug || file.replace(/\.md$/, '');
      return {
        slug,
        name: fm.title || slug,
        topic: fm.topic || '',
        order: fm.order ? Number(fm.order) : 999,
        url: `/projects/${slug}/`,
      };
    })
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

/* cast.yml is a list of units, each with a library below it. Two levels of
   indentation is all this reads; anything else in the file is somebody else's. */
const cast = () => {
  const out = [];
  let unit = null;
  let inLibrary = false;
  let inside = false;
  for (const line of readText(join(ROOT, '_data', 'cast.yml')).split(/\r?\n/)) {
    if (/^cast:\s*$/.test(line)) { inside = true; continue; }
    if (/^[a-z]+:/.test(line)) { inside = false; continue; }
    if (!inside) continue;
    if (/^\s{2}-\s+\w+:/.test(line)) {
      unit = { slug: '', name: '', library: '', libraryName: '' };
      out.push(unit);
      inLibrary = false;
    }
    if (!unit) continue;
    const deep = line.match(/^\s{6}(\w+):\s*(.+)$/);
    if (deep && inLibrary) {
      if (deep[1] === 'slug') unit.library = deep[2].replace(/^["']|["']$/g, '');
      if (deep[1] === 'name') unit.libraryName = deep[2].replace(/^["']|["']$/g, '');
    }
    const first = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
    if (first) {
      inLibrary = false;
      if (first[1] === 'slug') unit.slug = first[2].replace(/^["']|["']$/g, '');
      if (first[1] === 'name') unit.name = first[2].replace(/^["']|["']$/g, '');
    }
    const shallow = line.match(/^\s{4}(\w+):\s*(.*)$/);
    if (shallow) {
      inLibrary = shallow[1] === 'library';
      if (!shallow[2] && inLibrary) continue;
      if (shallow[1] === 'slug') unit.slug = shallow[2].replace(/^["']|["']$/g, '');
      if (shallow[1] === 'name') unit.name = shallow[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
};

const topicByRepo = () => {
  const path = join(ROOT, '_data', 'topic-by-repo.yml');
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readText(path).split(/\r?\n/)) {
    const m = line.match(/^\s{2}"?([^":]+)"?:\s*([a-z-]+)/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};

const posts = () => {
  const dir = join(ROOT, '_posts');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const fm = frontMatter(readText(join(dir, file)));
      return { slug: file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''), title: fm.title || '', topic: fm.topic || '' };
    });
};

/* ------------------------------------------------------------------ the layout */

function layout({ topics: ts, repos: rs, cast: cu, posts: ps, assignment }) {
  const next = rng(SEED);
  const nodes = [];
  const edges = [];

  nodes.push({
    id: 'station', kind: 'datum', name: 'Origin', url: '/',
    size: SIZES.datum, p: [0, 0, 0], weight: 4,
  });

  const topicAt = ts.map((t, i) => {
    const angle = -Math.PI / 2 + (i / ts.length) * Math.PI * 2 + jitter(next, 0.12);
    const radius = 1.26 + jitter(next, 0.1);
    const y = 0.64 + jitter(next, 0.14);
    nodes.push({
      id: `topic:${t.slug}`, kind: 'topic', name: t.name, url: `/journal/#${t.slug}`,
      size: SIZES.topic, p: [radius * Math.cos(angle), y, radius * Math.sin(angle)], weight: 2,
    });
    edges.push({ a: 'station', b: `topic:${t.slug}`, kind: 'spine' });
    return { slug: t.slug, angle, radius, y };
  });

  /* A repository sits in its topic's fan, further out and lower, so the five
     arms read as arms. Its own seed keeps it where it is when another
     repository lands in front of it in the file. */
  for (const r of rs) {
    const slug = assignment[r.slug] || r.topic;
    const topic = topicAt.find((t) => t.slug === slug);
    if (!topic) {
      console.warn(`  repository ${r.slug} has no topic: it is drawn, unfiled`);
      nodes.push({
        id: `repo:${r.slug}`, kind: 'repo', name: r.name, url: r.url,
        size: SIZES.repo, p: [0, 2.2, 0], weight: 1, unfiled: true,
      });
      continue;
    }
    const members = rs.filter((x) => (assignment[x.slug] || x.topic) === topic.slug);
    const k = members.findIndex((x) => x.slug === r.slug);
    const n = members.length;
    const own = rng(seedOf(r.slug));
    const spread = n > 1 ? 0.58 : 0;
    const angle = topic.angle + ((k - (n - 1) / 2) / Math.max(1, n - 1)) * spread + jitter(own, 0.03);
    const radius = topic.radius + 0.88 + (k % 2) * 0.4 + jitter(own, 0.05);
    const y = topic.y - 0.2 + (k % 3) * 0.19 + jitter(own, 0.04);
    nodes.push({
      id: `repo:${r.slug}`, kind: 'repo', name: r.name, url: r.url,
      size: SIZES.repo, p: [radius * Math.cos(angle), y, radius * Math.sin(angle)], weight: 1,
    });
    edges.push({ a: `topic:${topic.slug}`, b: `repo:${r.slug}`, kind: 'relation' });
  }

  /* Four units on a high band, one per library. Three front a page here; the
     fourth -- reeldeal -- fronts a library that has no page yet, so its edge has
     nowhere to land and the node keeps its own place in the sky. */
  const bands = [
    [-2.45, 1.02], [-1.62, 1.16], [1.56, 1.12], [2.4, 0.98],
  ];
  cu.forEach((u, i) => {
    const own = rng(seedOf(u.slug));
    const [ax, ay] = bands[i % bands.length];
    const fronted = rs.some((r) => r.slug === u.library);
    nodes.push({
      id: `unit:${u.slug}`, kind: 'unit', name: u.name, url: `/series/#${u.slug}`,
      size: SIZES.unit, p: [ax + jitter(own, 0.16), ay + jitter(own, 0.1), 0.35 + jitter(own, 0.2)],
      weight: 1, fronted, libraryName: u.libraryName,
    });
    if (fronted) edges.push({ a: `repo:${u.library}`, b: `unit:${u.slug}`, kind: 'relation' });
  });

  /* The journal is the arm with nothing on it yet: one bracket past the last
     repository, reached by an open edge. An entry, when there is one, hangs a
     tick off the bracket on the same fan. */
  nodes.push({
    id: 'journal', kind: 'journal', name: 'Journal', url: '/journal/',
    size: SIZES.journal, p: [2.86, 0.44, 0.71], weight: 1, count: ps.length,
  });
  edges.push({ a: 'station', b: 'journal', kind: 'open' });
  ps.forEach((post, i) => {
    const own = rng(seedOf(post.slug));
    nodes.push({
      id: `entry:${post.slug}`, kind: 'entry', name: post.title, url: `/journal/${post.slug}/`,
      size: 0.075, p: [2.86 + 0.32 + i * 0.14, 0.44 + jitter(own, 0.12), 0.71 + jitter(own, 0.08)], weight: 1,
    });
    edges.push({ a: 'journal', b: `entry:${post.slug}`, kind: 'relation' });
  });

  return { nodes, edges };
}

/* ------------------------------------------------------------------- the checks */

const PORTRAIT = 420 / 828;

const POSES = () => {
  const out = [];
  for (const yaw of [-CAMERA.yaw, 0, CAMERA.yaw]) {
    for (const pitch of [-CAMERA.pitch, 0, CAMERA.pitch]) {
      for (const dolly of CAMERA.dolly) out.push({ yaw, pitch, dolly });
    }
  }
  return out;
};

/* Forms that land on each other after the seeded jitter are nudged until
   nothing touches. Each movable form tries sixteen directions on its own arm
   and keeps the one that leaves it furthest from its nearest neighbour, so the
   result does not depend on the order of the loop and a re-run lands on the
   same answer. The station and the five topic rings never move: they are where
   the map is anchored, so a repository that arrives on top of one gives way. */
function relax(nodes) {
  const movable = nodes.filter((n) => n.kind === 'repo' || n.kind === 'unit');
  const v = view(state(CAMERA, {}));
  const clearance = (a, others) => {
    const qa = project(v, ASPECT, a.p);
    let worst = Infinity;
    for (const b of others) {
      if (b === a) continue;
      const qb = project(v, ASPECT, b.p);
      const d = Math.hypot((qa[0] - qb[0]) * 720, (qa[1] - qb[1]) * 396);
      worst = Math.min(worst, d - (pxRadius(a) + pxRadius(b) + 6));
    }
    return worst;
  };
  const steps = [0.06, 0.12, 0.2];
  let moves = 0;
  for (let pass = 0; pass < 24; pass++) {
    let moved = 0;
    for (const n of movable) {
      let best = clearance(n, nodes);
      if (best >= 0) continue;
      const home = [n.p[0], n.p[1], n.p[2]];
      let bestP = null;
      for (const step of steps) {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          for (const lift of [0, -0.08, 0.08]) {
            n.p[0] = home[0] + Math.cos(a) * step;
            n.p[1] = home[1] + lift;
            n.p[2] = home[2] + Math.sin(a) * step;
            const c = clearance(n, nodes);
            if (c > best) {
              best = c;
              bestP = [n.p[0], n.p[1], n.p[2]];
            }
          }
        }
      }
      if (bestP) {
        n.p[0] = bestP[0];
        n.p[1] = bestP[1];
        n.p[2] = bestP[2];
        moved++;
        moves++;
      } else {
        n.p[0] = home[0];
        n.p[1] = home[1];
        n.p[2] = home[2];
      }
    }
    if (!moved) break;
  }
  return moves;
}

/* Aim the camera so the map sits in the band the hero leaves for it, instead of
   making the layout depend on hand-tuned offsets that a re-seeded jitter would
   invalidate. The projection is close enough to linear in the target for this to
   converge in six passes.

   The box is aimed at AXIS rather than at 0: the plate's mass sits left of
   centre, the right of the frame is the deliberate empty, and the journal's arm
   crosses it and leaves. */
function settle(nodes) {
  const cam = { ...CAMERA, target: [...CAMERA.target] };
  const top = 1 - MARGIN - 0.012;
  for (let pass = 0; pass < 6; pass++) {
    const v = view(state(cam, {}));
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
    for (const pose of POSES(ASPECT)) {
      const pv = view(state(cam, pose));
      for (const n of nodes) {
        const q = project(pv, ASPECT, n.p);
        const rx = (n.size * PER_UNIT) / (1440 / 2);
        const ry = (n.size * PER_UNIT) / (792 / 2);
        x0 = Math.min(x0, q[0] - rx);
        x1 = Math.max(x1, q[0] + rx);
        y0 = Math.min(y0, q[1] - ry);
        y1 = Math.max(y1, q[1] + ry);
      }
    }
    const sc = scales(v, ASPECT);
    const want = { x: AXIS, y: (TYPE_BAND[1.82] + top) / 2 };
    const dx = (x0 + x1) / 2 - want.x;
    const dy = (y0 + y1) / 2 - want.y;
    if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) break;
    const d = Math.hypot(...v.eye.map((e, i) => e - cam.target[i]));
    cam.target[0] += (dx * d * sc.tanX) / Math.cos((cam.elevation * Math.PI) / 180);
    cam.target[1] += (dy * d * sc.tanY) / Math.cos((cam.elevation * Math.PI) / 180);
  }
  return cam;
}

/* Pixels per world unit at 1440 x 792, on the plane through the camera target:
   the frame's half width is tanX * radius world units. */
const PER_UNIT = 1440 / (2 * Math.tan((CAMERA.fov * Math.PI) / 360) * ASPECT * CAMERA.radius);
const pxRadius = (n) => n.size * PER_UNIT;

/* ------------------------------------------------------------------- the drawing */

const VB_W = 1820;
const VB_H = 1000;
const TINTS = { star: '--star', cream: '--cream', dust: '--dust', amber: '--amber', cyan: '--cyan' };

const round = (n) => Math.round(n * 10) / 10;

/* What a form hides, projected: a convex polygon in normalised device
   coordinates and the distance in front of the camera it sits at. */
function occludersFor(nodes, v) {
  const out = [];
  for (const n of nodes) {
    const q = project(v, ASPECT, n.p);
    if (!q) continue;
    const poly = hull(n.kind, n.size)
      .map(([x, y]) => {
        const p = project(v, ASPECT, place([[x, y, x, y]], n.p, v)[0][0]);
        return p ? [p[0], p[1]] : null;
      })
      .filter(Boolean);
    if (poly.length >= 3) out.push({ poly, z: q[2], id: n.id });
  }
  return out;
}

/* Every stroke the plate is made of, cut and classed: an edge as its visible
   pieces (occlusion, the haze's trim, and a step wherever it crosses a depth
   role), a form as its own segments with a face. One list, drawn twice: to the
   still below, and checked before either file is written. */
function drawing(nodes, edges, v) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const occ = occludersFor(nodes, v);
  const at = (p) => {
    const q = project(v, ASPECT, p);
    return q ? toPixel(q, VB_W, VB_H) : null;
  };
  const lines = [];
  const rungs = [];
  const push = (into, cls, a, b, role, face, alpha, z, ends) => {
    const pa = at(a);
    const pb = at(b);
    if (!pa || !pb) return;
    into.push({ cls, a: pa, b: pb, role, face, alpha, z0: z ? z[0] : 0, z1: z ? z[1] : 0, ends });
  };

  for (const e of edges) {
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    if (!a || !b) continue;
    const qa = project(v, ASPECT, a.p);
    const qb = project(v, ASPECT, b.p);
    if (!qa || !qb) continue;
    const trim = { head: HAZE.gap[depthAt(CAMERA, qa[2])], tail: HAZE.gap[depthAt(CAMERA, qb[2])] };
    const cls = e.kind === 'spine' ? 'scene-spine' : e.kind === 'open' ? 'scene-open' : 'scene-edge';
    const runs = e.kind === 'open' ? dash(a.p, b.p, DASH) : [[a.p, b.p]];
    for (const [p, q] of runs) {
      /* A dash carries no trim of its own -- the pen is already lifted at
         every gap -- but the forms at both ends still hide it. */
      const spans = pieces(CAMERA, v, ASPECT, p, q, occ, {
        ...(e.kind === 'open' ? { head: 0, tail: 0 } : trim),
        attached: [a.id, b.id],
      });
      for (const span of spans) {
        push(lines, cls, span.a, span.b, span.role, '', valueAt(CAMERA, span.z), [span.z0, span.z1], [a.id, b.id]);
      }
      if (e.kind === 'spine') {
        for (const [p0, p1] of spans.map((s) => [s.a, s.b])) {
          for (const r of run(p0, p1, RUNG, v)) {
            const m = [(r[0][0] + r[1][0]) / 2, (r[0][1] + r[1][1]) / 2, (r[0][2] + r[1][2]) / 2];
            const q = project(v, ASPECT, m);
            if (!q) continue;
            push(rungs, 'scene-rung', r[0], r[1], depthAt(CAMERA, q[2]), '', valueAt(CAMERA, q[2]), [q[2], q[2]]);
          }
        }
      }
    }
  }

  /* The arm off the frame: from the journal's bracket, through the frame's
     right edge. The deliberate crop, and the only line here whose end is not
     a record. */
  const journal = byId.get('journal');
  if (journal) {
    const q = project(v, ASPECT, journal.p);
    const from = unproject(v, ASPECT, [q[0] + 0.012, q[1]], q[2]);
    const to = unproject(v, ASPECT, [1.04, q[1] - 0.004], q[2] * (1 + CROP.reach / 100));
    for (const [p0, p1] of dash(from, to, DASH)) {
      for (const span of pieces(CAMERA, v, ASPECT, p0, p1, occ, { head: 0, tail: 0 })) {
        push(lines, 'scene-open', span.a, span.b, span.role, '', valueAt(CAMERA, span.z), [span.z0, span.z1], ['journal', 'crop']);
      }
    }
  }

  const forms = [];
  for (const n of nodes) {
    const q = project(v, ASPECT, n.p);
    if (!q) continue;
    const role = depthAt(CAMERA, q[2]);
    const value = valueAt(CAMERA, q[2]);
    const cls = `scene-${n.kind === 'entry' ? 'journal' : n.kind}`;
    for (const seg of place(form(n.kind, n.size), n.p, v)) {
      const [nx, ny] = normalOf(seg, n.p, v);
      const face = faceOf(nx, ny);
      push(forms, cls, seg[0], seg[1], role, face, value * (face === 'lit' ? 1 : 0.52), [q[2], q[2]]);
    }
  }

  return { lines, rungs, forms };
}

/* ------------------------------------------------------------------- the SVG */

function svg(nodes, edges, labels, counts, draw) {
  const v = view(state(CAMERA, { dolly: 1 }));
  const at = (p) => toPixel(project(v, ASPECT, p), VB_W, VB_H);

  const fmt = (x) => round(x).toFixed(1).replace(/\.0$/, '');

  const emit = (list) => {
    const groups = new Map();
    for (const s of list) {
      const alpha = Math.round(s.alpha * 100) / 100;
      const key = `${s.cls}|${s.role}|${s.face}|${alpha.toFixed(2)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(`M${fmt(s.a[0])} ${fmt(s.a[1])}L${fmt(s.b[0])} ${fmt(s.b[1])}`);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, segs]) => {
        const [cls, role, face, alpha] = key.split('|');
        return `<path class="${cls}" data-depth="${role}"${face ? ` data-light="${face}"` : ''} opacity="${alpha}" d="${segs.join('')}"/>`;
      })
      .join('');
  };

  const sky = stars(SEED, CAMERA, ASPECT);
  const bands = new Map();
  for (const s of sky) {
    const q = project(v, ASPECT, s.p);
    if (!q) continue;
    const key = `${s.size.toFixed(0)}|${(Math.round(s.alpha * 0.6 * 50) / 50).toFixed(2)}`;
    if (!bands.has(key)) bands.set(key, []);
    const [px, py] = at(s.p);
    bands.get(key).push(`M${fmt(px)} ${fmt(py)}h.01`);
  }

  const haze = blobs()
    .map((b) => {
      const q = project(v, ASPECT, b.p);
      if (!q) return '';
      const r = (b.r / (q[2] * Math.tan((CAMERA.fov * Math.PI) / 360) * ASPECT)) * (VB_W / 2);
      const [px, py] = at(b.p);
      return `<circle cx="${fmt(px)}" cy="${fmt(py)}" r="${fmt(r)}" fill="url(#haze-${b.tint})" opacity="${b.alpha.toFixed(3)}"/>`;
    })
    .join('');

  const defs = Object.entries(TINTS)
    .map(
      ([tint]) =>
        `<radialGradient id="haze-${tint}"><stop offset="0" stop-color="var(${TINTS[tint]})" stop-opacity="1"/>` +
        [0.25, 0.5, 0.75].map((d) => `<stop offset="${d * 100}%" stop-color="var(${TINTS[tint]})" stop-opacity="${falloff(d).toFixed(3)}"/>`).join('') +
        `<stop offset="100%" stop-color="var(${TINTS[tint]})" stop-opacity="0"/></radialGradient>`,
    )
    .join('');

  const starPaths = [...bands.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, segs]) => {
      const [size, alpha] = key.split('|');
      return `<path class="scene-star" data-size="${size}" opacity="${alpha}" d="${segs.join('')}"/>`;
    })
    .join('');

  const text = labels
    .filter((l) => l.show)
    .map(
      (l) =>
        `<text class="scene-label" x="${fmt(l.x)}" y="${fmt(l.y)}"${l.mid ? ' text-anchor="middle"' : ''} opacity="${(Math.round(l.alpha * 100) / 100).toFixed(2)}">${l.text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</text>`,
    )
    .join('');

  const desc =
    `The site's own map: ${counts.topics} topics, ${counts.repos} repositories, ` +
    `${counts.units} series units and ${counts.entries} journal entries, laid out around the station at the centre. ` +
    `A ring is a topic, a diamond a repository, a triangle a series unit, a bracket the journal. ` +
    `Each shape is labelled where there is room; every one links from the lists below this frame.`;

  return `<svg class="scene-still" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="scene-title scene-desc" xmlns="http://www.w3.org/2000/svg">
<title id="scene-title">The map of the site</title>
<desc id="scene-desc">${desc}</desc>
<defs>${defs}</defs>
<g class="scene-haze">${haze}</g>
<g class="scene-stars">${starPaths}</g>
<g class="scene-edges">${emit(draw.lines)}</g>
<g class="scene-rungs">${emit(draw.rungs)}</g>
<g class="scene-forms">${emit(draw.forms)}</g>
<g class="scene-labels">${text}</g>
</svg>
`;
}

/* ------------------------------------------------------------------- labels */

const LABELS = ['topic', 'unit', 'journal', 'datum'];

/* Where each name sits, and the grid it sits on.

   A name is set above its form (beside it, for the journal), clear of the form
   by LABEL_GRID.gap, and then its baseline is snapped to the nearest row of
   LABEL_GRID -- moving up a row rather than down when that is what it takes to
   keep the gap. The rows are the same across the plate, which is what makes
   eleven separate names read as one set of labels rather than as eleven
   floating words.

   The offset lives in the data (`label:` on the node) so the canvas puts every
   name in the same place. */
function labels(nodes, v) {
  const home = project(v, ASPECT, [0, 0, 0]);
  const out = [];
  const toPx = (ndc) => toPixel(ndc, VB_W, VB_H);
  const toNdc = (px) => [(px[0] / VB_W) * 2 - 1, 1 - (px[1] / VB_H) * 2];
  for (const n of nodes) {
    if (!LABELS.includes(n.kind)) continue;
    const q = project(v, ASPECT, n.p);
    if (!q) continue;
    let dx = 0;
    let dy = 0;
    if (n.kind === 'topic') {
      const d = Math.hypot(q[0] - home[0], q[1] - home[1]) || 1;
      dx = ((q[0] - home[0]) / d) * 0.072;
      dy = ((q[1] - home[1]) / d) * 0.072 + 0.006;
    } else if (n.kind === 'unit') dy = 0.034;
    else if (n.kind === 'journal') dx = 0.018;
    else if (n.kind === 'datum') dy = -0.05;
    const px = toPx([q[0] + dx, q[1] + dy]);
    const text = n.kind === 'journal' ? `${n.name} · ${n.count} ${n.count === 1 ? 'entry' : 'entries'}` : n.name;
    const w = text.length * LABEL_GRID.advance;
    /* How tall the form it names actually draws, so the gap is the gap. */
    const centre = toPx(q);
    const reach = Math.max(
      ...hull(n.kind, n.size).map(([hx, hy]) => {
        const p = project(v, ASPECT, place([[hx, hy, hx, hy]], n.p, v)[0][0]);
        const pxx = p ? toPixel(p, VB_W, VB_H) : centre;
        return Math.hypot(pxx[0] - centre[0], pxx[1] - centre[1]);
      }),
    );
    const top = centre[1] - (n.kind === 'journal' ? 0 : reach);
    let y = labelRow(px[1]);
    while (top - y < LABEL_GRID.gap && y > LABEL_GRID.top) y -= LABEL_GRID.row;
    /* A name never leaves the frame: the journal's, at the plate's right edge,
       slides left until it fits. */
    const x = n.kind === 'journal' ? Math.min(px[0], VB_W - w - 8) : px[0];
    const snapped = toNdc([x, y]);
    n.label = [Math.round((snapped[0] - q[0]) * 1000) / 1000, Math.round((snapped[1] - q[1]) * 1000) / 1000];
    out.push({
      id: n.id,
      kind: n.kind,
      text,
      ndc: snapped,
      mid: n.kind !== 'journal',
      x,
      y,
      w,
      h: LABEL_GRID.cap,
      alpha: valueAt(CAMERA, q[2]),
      show: true,
    });
  }

  /* Names that would sit on each other are dropped, in order, rather than piled
     up: an unlabelled form is still a form, and the page names every one of them
     in text below the frame. */
  const kept = [];
  for (const l of out) {
    const box = { x0: l.x - (l.mid ? l.w / 2 : 0), x1: l.x + (l.mid ? l.w / 2 : l.w), y0: l.y - l.h, y1: l.y + 3 };
    l.show = !kept.some((k) => box.x0 < k.x1 && box.x1 > k.x0 && box.y0 < k.y1 && box.y1 > k.y0);
    if (l.show) kept.push(box);
    l.box = box;
  }
  return out;
}

/* ------------------------------------------------------------------- outputs */

function yamlDoc(nodes, edges, counts) {
  const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  const out = [];
  out.push('# Generated by scripts/scene/map.mjs. Do not edit.');
  out.push('#');
  out.push('# The home page\'s map: one node per thing the site actually holds, one');
  out.push('# edge per relation the repository actually records. Positions are world');
  out.push('# units in a right-handed frame, y up, the station at the origin.');
  out.push('#');
  out.push('#   ring     topic        a graduated ring, sixteen sides');
  out.push('#   diamond  repository   four sides');
  out.push('#   triangle series unit  three sides, apex up');
  out.push('#   bracket  journal      open to the right, nothing on it yet');
  out.push('#   ring+cross+mast  the station, the origin of the map');
  out.push('#');
  out.push('# `camera.depth` is the depth ramp both renderers read: the four stops,');
  out.push('# the value of each, and where the roles split.');
  out.push('');
  out.push(`seed: ${SEED}`);
  out.push('counts:');
  for (const [k, val] of Object.entries(counts)) out.push(`  ${k}: ${val}`);
  out.push('camera:');
  out.push(`  fov: ${CAMERA.fov}`);
  out.push(`  aspect: ${CAMERA.aspect}`);
  out.push(`  radius: ${CAMERA.radius}`);
  out.push(`  target: [${CAMERA.target.join(', ')}]`);
  out.push(`  elevation: ${CAMERA.elevation}`);
  out.push(`  azimuth: ${CAMERA.azimuth}`);
  out.push(`  yaw: ${CAMERA.yaw}`);
  out.push(`  pitch: ${CAMERA.pitch}`);
  out.push(`  dolly: [${CAMERA.dolly.join(', ')}]`);
  out.push('  depth:');
  out.push(`    near: ${CAMERA.depth.near}`);
  out.push(`    far: ${CAMERA.depth.far}`);
  out.push(`    highlight: ${CAMERA.depth.highlight}`);
  out.push(`    split: [${CAMERA.depth.split.join(', ')}]`);
  out.push('    value:');
  for (const [k, val] of Object.entries(CAMERA.depth.value)) out.push(`      ${k}: ${val}`);
  out.push('nodes:');
  for (const n of nodes) {
    out.push(`- id: ${n.id}`);
    out.push(`  kind: ${n.kind}`);
    out.push(`  name: ${q(n.name)}`);
    out.push(`  url: ${q(n.url)}`);
    out.push(`  size: ${n.size}`);
    out.push(`  weight: ${n.weight}`);
    if (n.count !== undefined) out.push(`  count: ${n.count}`);
    if (n.label) out.push(`  label: [${n.label.join(', ')}]`);
    out.push(`  p: [${n.p.map((x) => Math.round(x * 1000) / 1000).join(', ')}]`);
  }
  out.push('edges:');
  for (const e of edges) out.push(`- [${e.a}, ${e.b}, ${e.kind}]`);
  return out.join('\n') + '\n';
}

/* ---------------------------------------------------------------- the report */

function inspect(nodes, edges, labels, draw) {
  const problems = [];
  const v = view(state(CAMERA, {}));
  const poses = POSES();

  for (const aspect of [ASPECT, PORTRAIT]) {
    const floor = aspect === ASPECT ? TYPE_BAND[1.82] : TYPE_BAND.PORTRAIT;
    for (const pose of poses) {
      const pv = view(state(CAMERA, pose));
      for (const n of nodes) {
        const ndc = project(pv, aspect, n.p);
        if (!ndc) {
          problems.push(`${n.id} is behind the camera at ${aspect.toFixed(2)} ${JSON.stringify(pose)}`);
          continue;
        }
        const [x, y] = ndc;
        const rx = (n.size * PER_UNIT) / (1440 / 2);
        const ry = (n.size * PER_UNIT) / (792 / 2);
        if (Math.abs(x) + rx > 1 - MARGIN || y + ry > 1 - MARGIN) {
          problems.push(`${n.id} leaves the frame at ${aspect.toFixed(2)} ${JSON.stringify(pose)}: ${x.toFixed(3)},${y.toFixed(3)}`);
        }
        if (y - ry < floor) {
          problems.push(`${n.id} falls into the type band at ${aspect.toFixed(2)} ${JSON.stringify(pose)}: y ${y.toFixed(3)}`);
        }
      }
    }
  }

  /* Forms overlapping: at 1440 the two nearest projected centres must be more
     than the sum of their radii, in pixels. */
  const at1440 = nodes.map((n) => ({ n, q: project(v, ASPECT, n.p) }));
  let closest = Infinity;
  for (let i = 0; i < at1440.length; i++) {
    for (let j = i + 1; j < at1440.length; j++) {
      const a = at1440[i];
      const b = at1440[j];
      const d = Math.hypot((a.q[0] - b.q[0]) * 0.5 * 1440, (a.q[1] - b.q[1]) * 0.5 * 792);
      const need = pxRadius(a.n) + pxRadius(b.n) + 6;
      if (d < need) problems.push(`${a.n.id} and ${b.n.id} overlap: ${d.toFixed(1)}px apart, ${need.toFixed(1)}px needed`);
      if (a.n.kind !== 'repo' || b.n.kind !== 'repo') closest = Math.min(closest, d);
    }
  }

  for (const e of edges) {
    for (const end of [e.a, e.b]) {
      if (!nodes.some((n) => n.id === end)) problems.push(`edge ${e.a} -> ${e.b} names ${end}, which is not on the map`);
    }
  }

  /* Hidden lines: no stroke of the plate may sit inside a nearer diamond. The
     cut is computed, and this is the file's own drawn geometry checked against
     the silhouettes -- not the cutter checked against itself. */
  const repos = nodes
    .filter((n) => n.kind === 'repo')
    .map((n) => {
      const q = project(v, ASPECT, n.p);
      const poly = hull(n.kind, n.size).map(([x, y]) => {
        const p = project(v, ASPECT, place([[x, y, x, y]], n.p, v)[0][0]);
        return toPixel(p, VB_W, VB_H);
      });
      return { id: n.id, z: q[2], poly };
    });
  const insideOn = (p, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  let crossings = 0;
  for (const s of [...draw.lines]) {
    const l = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const steps = Math.max(1, Math.ceil(l / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
      const z = s.z0 > 0 ? 1 / (1 / s.z0 + t * (1 / s.z1 - 1 / s.z0)) : 0;
      for (const r of repos) {
        /* Only a form in front of the ink hides it -- except at the two ends an
           edge actually has, where the form it lands on hides it whatever the
           depth tie: an edge that reaches the centre of its own diamond has
           crossed the silhouette it should have stopped at. */
        const atEnd = s.ends && s.ends.includes(r.id);
        if (!atEnd && r.z > z - 1e-3) continue;
        if (insideOn(p, r.poly)) {
          crossings++;
          problems.push(`${s.cls} ${s.role} has ink inside ${r.id} (form z ${r.z.toFixed(2)}, ink z ${z.toFixed(2)}, at ${p[0].toFixed(0)},${p[1].toFixed(0)}, piece ${s.a.map((v) => v.toFixed(0)).join('/')}..${s.b.map((v) => v.toFixed(0)).join('/')})`);
          i = steps + 1;
          break;
        }
      }
    }
  }

  /* The grid: a label's baseline is a row, and its box stays in the frame. */
  for (const l of labels.filter((x) => x.show)) {
    /* The row arithmetic written out, not read back through `labelRow()`: a
       gate that asks the same function that placed the label is no gate. */
    const k = (l.y - LABEL_GRID.top) / LABEL_GRID.row;
    if (Math.abs(k - Math.round(k)) * LABEL_GRID.row > 0.01) {
      problems.push(`label ${l.text} is off the row at y ${l.y.toFixed(2)}: ${(Math.abs(k - Math.round(k)) * LABEL_GRID.row).toFixed(2)} from the nearest row`);
    }
    if (l.box.x0 < 0 || l.box.x1 > VB_W) problems.push(`label ${l.text} leaves the frame: ${l.box.x0.toFixed(0)}..${l.box.x1.toFixed(0)}`);
    if (l.box.y1 < 0 || l.y > VB_H) problems.push(`label ${l.text} is off the top of the frame`);
  }

  /* One light: every closed form takes it on some faces and loses it on
     others, or the light is not doing anything. */
  const faces = new Map();
  for (const s of draw.forms) {
    if (!faces.has(s.cls + s.role)) faces.set(s.cls + s.role, { lit: 0, shadow: 0 });
    faces.get(s.cls + s.role)[s.face]++;
  }
  for (const [key, f] of faces) {
    if (f.lit && !f.shadow) problems.push(`${key} has no shadowed face`);
    if (f.shadow && !f.lit) problems.push(`${key} has no lit face`);
  }

  return { problems, closest, crossings };
}

/* ----------------------------------------------------------------------- run */

function main() {
  const ts = topics();
  const rs = repos();
  const cu = cast();
  const ps = posts();
  const assignment = topicByRepo();

  if (ts.length !== 5) throw new Error(`expected five topics, read ${ts.length}`);
  if (rs.length !== 19) throw new Error(`expected nineteen repository pages, read ${rs.length} (${rs.map((r) => r.slug).join(', ')})`);
  if (cu.length !== 4) throw new Error(`expected four series units, read ${cu.length}`);
  for (const r of rs) {
    if (!(assignment[r.slug] || r.topic)) throw new Error(`no topic for ${r.slug}: _data/topic-by-repo.yml is missing it`);
  }

  const { nodes, edges } = layout({ topics: ts, repos: rs, cast: cu, posts: ps, assignment });
  /* Aim and settle in turn: the camera decides what "too close" means, and
     moving a form changes where the camera wants to be. Three rounds is two
     more than it needs and makes the fixpoint easy to read in the report. */
  let moves = 0;
  for (let round = 0; round < 3; round++) {
    CAMERA = settle(nodes);
    const nudged = relax(nodes);
    if (!nudged) break;
    moves += nudged;
  }
  CAMERA = settle(nodes);
  const v = view(state(CAMERA, {}));
  const ls = labels(nodes, v);
  const counts = { topics: ts.length, repos: rs.length, units: cu.length, entries: ps.length };
  const draw = drawing(nodes, edges, v);

  const { problems, closest, crossings } = inspect(nodes, edges, ls, draw);
  const svgText = svg(nodes, edges, ls, counts, draw);
  const yamlText = yamlDoc(nodes, edges, counts);

  const box = { x0: 1, y0: 1, x1: -1, y1: -1 };
  for (const n of nodes) {
    const q = project(v, ASPECT, n.p);
    box.x0 = Math.min(box.x0, q[0]);
    box.x1 = Math.max(box.x1, q[0]);
    box.y0 = Math.min(box.y0, q[1]);
    box.y1 = Math.max(box.y1, q[1]);
  }

  const strokes = draw.lines.length + draw.rungs.length + draw.forms.length;
  const roles = { highlight: 0, near: 0, mid: 0, far: 0 };
  for (const s of [...draw.lines, ...draw.rungs, ...draw.forms]) roles[s.role]++;

  const rows = [
    ['nodes', nodes.length],
    ['edges', edges.length],
    ['strokes drawn', strokes],
    ['  edges', draw.lines.length],
    ['  rungs', draw.rungs.length],
    ['  forms', draw.forms.length],
    ['depth roles', `hi ${roles.highlight} / near ${roles.near} / mid ${roles.mid} / far ${roles.far}`],
    ['stars', stars(SEED, CAMERA, ASPECT).length],
    ['labels kept', ls.filter((l) => l.show).length + '/' + ls.length],
    ['frame box x', `${box.x0.toFixed(3)} .. ${box.x1.toFixed(3)}`],
    ['frame box y', `${box.y0.toFixed(3)} .. ${box.y1.toFixed(3)}`],
    ['closest pair', `${closest.toFixed(1)} px at 1440`],
    ['forms nudged', moves],
    ['yaml bytes', yamlText.length],
    ['svg bytes', svgText.length],
  ];
  console.log(rows.map(([k, x]) => `  ${String(k).padEnd(16)} ${x}`).join('\n'));

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n  ` + [...new Set(problems)].slice(0, 24).join('\n  '));
    process.exitCode = 1;
    return;
  }

  /* Byte-identical: the same content and the same seed give the same two
     files, byte for byte, on any engine -- the arithmetic is 32-bit integer
     where it decides where anything goes, and every number written is rounded
     before it is written. `--check` is what CI runs: it writes nothing and
     exits 1 when a committed file is not what this seed draws. */
  const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
  if (CHECK) {
    let stale = 0;
    for (const [path, text] of [
      [OUT_YAML, yamlText],
      [OUT_SVG, svgText],
    ]) {
      const disk = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
      if (disk === text) {
        console.log(`  ok       ${path.split(/[\\/]/).slice(-2).join('/')}  ${sha(text)}  ${text.length} bytes, LF`);
      } else {
        console.log(`  STALE    ${path.split(/[\\/]/).slice(-2).join('/')}  re-run node scripts/scene/map.mjs`);
        stale++;
      }
    }
    console.log(`\n  ${stale ? `${stale} file(s) out of date` : 'clean: the same content gives the same bytes'}`);
    process.exitCode = stale ? 1 : 0;
    return;
  }

  writeFileSync(OUT_YAML, yamlText);
  writeFileSync(OUT_SVG, svgText);
  console.log(`\n  wrote _data/scene-map.yml (${sha(yamlText)}) and _includes/scene/map.svg (${sha(svgText)})`);
  console.log('  deterministic: the same content and seed give the same bytes');
}

main();
