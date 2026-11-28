#!/usr/bin/env node
/* What the map's still actually measures.

     node --experimental-default-type=module scripts/scene/measure.mjs [--json out] [--label name]

   This reads the *generated* files -- _includes/scene/map.svg and
   _data/scene-map.yml -- and counts, on its own, the things a reader would see
   without measuring: ink that runs through a form that should hide it, the
   value each depth role is drawn at, the repeated pitches in the small detail,
   how much of the frame is dense and how much is deliberately empty, and
   whether the names sit on one baseline grid.

   Nothing here trusts the generator's report. Depth is recomputed from the
   YAML and the camera; a stroke's role is decided by where it lands, not by
   what it says it is. The gates at the end are checked on the file: a still
   that has been hand-edited into a defect fails them.

   Six measurements, in the order a plate is read:

     hidden lines    samples along every edge, in the frame; a sample that
                     falls inside a nearer repository diamond must have no
                     edge ink on it. The number of hidden runs the geometry
                     contains, and the number of them ink still crosses.
     values          ink length and ink weight per depth role, the mean
                     opacity of each, and the ratio between the roles; plus
                     the accent's share of the ink.
     pitches         modal spacing between parallel strokes of the same class,
                     detected per class, with how many strokes sit at it.
     density         a 4 x 4 grid over the plate and over the whole frame:
                     ink length per cell, densest over emptiest.
     baselines       every label's baseline against the stated row grid.
     light           each closed form's faces: how many lit, how many in
                     shadow, and whether the lit ones face the stated azimuth.

   The last section, --gates, is the same checks as pass/fail, for a file
   checked by hand or by CI. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ASPECT, state, view, project, scales, unproject, depthAt, depthUnit as depthUnitOf } from '../../assets/scene/lib/camera.js';
import { form, place, hull, LIGHT, LABEL_GRID } from '../../assets/scene/lib/forms.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SVG = join(ROOT, '_includes', 'scene', 'map.svg');
const YML = join(ROOT, '_data', 'scene-map.yml');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const svgPath = flag('svg', SVG);
const ymlPath = flag('yaml', YML);
const jsonOut = flag('json', null);
const label = flag('label', 'still');

/* ------------------------------------------------------------------- the data */

function readYaml(text) {
  const out = { camera: { depth: {} }, nodes: [], edges: [] };
  let node = null;
  let section = '';
  let sub = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith('#')) continue;
    if (/^seed:/.test(line)) out.seed = +line.split(':')[1].trim();
    if (/^camera:/.test(line)) { section = 'camera'; continue; }
    if (/^nodes:/.test(line)) { section = 'nodes'; continue; }
    if (/^edges:/.test(line)) { section = 'edges'; continue; }
    if (/^counts:/.test(line)) { section = 'counts'; continue; }
    if (section === 'camera') {
      const m = line.match(/^  (\w+):\s*(.*)$/);
      if (m) {
        if (!m[2]) { sub = m[1]; continue; }
        sub = '';
        out.camera[m[1]] = m[2].startsWith('[') ? JSON.parse(m[2]) : Number(m[2]);
      }
      const d = line.match(/^    (\w+):\s*(.*)$/);
      if (d && sub === 'depth') out.camera.depth[d[1]] = d[2].startsWith('[') ? JSON.parse(d[2]) : Number(d[2]);
      else if (d && sub === 'fade') out.camera.fade = { ...(out.camera.fade || {}), [d[1]]: Number(d[2]) };
      continue;
    }
    if (section === 'nodes') {
      const id = line.match(/^- id:\s*(.+)$/);
      if (id) { node = { id: id[1].trim() }; out.nodes.push(node); continue; }
      if (!node) continue;
      const m = line.match(/^  (\w+):\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (k === 'p' || k === 'label') node[k] = JSON.parse(v);
      else if (k === 'kind' || k === 'name' || k === 'url') node[k] = v.replace(/^"|"$/g, '');
      else node[k] = Number(v);
      continue;
    }
    if (section === 'edges') {
      const m = line.match(/^- \[(.+)\]$/);
      if (m) {
        const [a, b, kind] = m[1].split(',').map((s) => s.trim());
        out.edges.push({ a, b, kind });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------- the file */

function readSvg(text) {
  const paths = [];
  const texts = [];
  const vb = (text.match(/viewBox="0 0 (\d+) (\d+)"/) || []).slice(1).map(Number);
  const pathRe = /<path([^>]*)\sd="([^"]*)"[^>]*\/>/g;
  let m;
  while ((m = pathRe.exec(text))) {
    const attrs = m[1];
    const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
    if (cls.includes('scene-star')) continue;
    const opacity = Number((attrs.match(/opacity="([^"]*)"/) || [, '1'])[1]);
    const depth = (attrs.match(/data-depth="([^"]*)"/) || [, ''])[1];
    const light = (attrs.match(/data-light="([^"]*)"/) || [, ''])[1];
    paths.push({ cls, opacity, depth, light, d: m[2] });
  }
  const textRe = /<text([^>]*)>([^<]*)<\/text>/g;
  while ((m = textRe.exec(text))) {
    const attrs = m[1];
    if (!/scene-label/.test(attrs)) continue;
    texts.push({
      x: Number((attrs.match(/\sx="([^"]*)"/) || [, '0'])[1]),
      y: Number((attrs.match(/\sy="([^"]*)"/) || [, '0'])[1]),
      mid: /text-anchor="middle"/.test(attrs),
      opacity: Number((attrs.match(/opacity="([^"]*)"/) || [, '1'])[1]),
      text: m[2],
    });
  }
  return { paths, texts, vb };
}

/* M/L pairs, H/V and h/v runs; enough for everything the generator writes. */
function segments(d) {
  const out = [];
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const re = /([MLHVZmlhvz])|(-?\d*\.?\d+)/g;
  let cmd = '';
  let nums = [];
  let m;
  const flush = () => {
    if (!nums.length) return;
    if (cmd === 'M' || cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const nx = nums[i];
        const ny = nums[i + 1];
        if (cmd === 'L' || i > 0) out.push([[x, y], [nx, ny]]);
        x = nx;
        y = ny;
      }
      sx = x;
      sy = y;
    } else if (cmd === 'H') {
      for (const nx of nums) { out.push([[x, y], [nx, y]]); x = nx; }
    } else if (cmd === 'V') {
      for (const ny of nums) { out.push([[x, y], [x, ny]]); y = ny; }
    } else if (cmd === 'h') {
      for (const dx of nums) { out.push([[x, y], [x + dx, y]]); x += dx; }
    } else if (cmd === 'v') {
      for (const dy of nums) { out.push([[x, y], [x, y + dy]]); y += dy; }
    }
    nums = [];
  };
  while ((m = re.exec(d))) {
    if (m[1]) { flush(); cmd = m[1]; if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; } }
    else nums.push(Number(m[2]));
  }
  flush();
  return out;
}

/* ------------------------------------------------------------------ geometry */

const cam = (y) => {
  const c = { ...y.camera };
  const d = c.depth && c.depth.split ? c.depth : {};
  const def = { near: 0.62, far: 1.62, highlight: 0.11, split: [0.33, 0.66], value: { highlight: 1, near: 0.88, mid: 0.6, far: 0.36 } };
  c.depth = { ...def, ...d };
  if (Array.isArray(c.depth.value)) {
    const [hi, ne, mi, fa] = c.depth.value;
    c.depth.value = { highlight: hi, near: ne, mid: mi, far: fa };
  }
  return c;
};

const round = (n, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const len = (s) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
const mid = (s) => [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];

/* Point in a projected polygon (the form's own silhouette, in pixels). */
function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distanceToSegment(p, s) {
  const [ax, ay] = s[0];
  const [bx, by] = s[1];
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy));
}

/* ------------------------------------------------------------------- main */

const svgText = readFileSync(svgPath, 'utf8');
const ymlText = readFileSync(ymlPath, 'utf8');
const data = readYaml(ymlText);
const file = readSvg(svgText);
const C = cam(data);
const [VBW, VBH] = file.vb.length === 2 ? file.vb : [1820, 1000];
const v = view(state(C, { dolly: 1 }));
const toPx = (ndc) => [(ndc[0] * 0.5 + 0.5) * VBW, (0.5 - ndc[1] * 0.5) * VBH];

const byId = new Map(data.nodes.map((n) => [n.id, n]));
for (const n of data.nodes) {
  const q = project(v, ASPECT, n.p);
  n.q = q;
  n.px = q ? toPx(q) : null;
  n.z = q ? q[2] : Infinity;
  n.role = q ? depthAt(C, q[2]) : 'far';
  /* The form's own silhouette, projected once: this is what the diamond
     hides, and it is what the light is measured against. */
  const poly = hull(n.kind, n.size).map((p) => {
    const w = place([[p[0], p[1], p[0], p[1]]], n.p, v)[0][0];
    const pp = project(v, ASPECT, w);
    return pp ? toPx(pp) : null;
  }).filter(Boolean);
  n.poly = poly;
  n.rpx = Math.max(...poly.map((p) => Math.hypot(p[0] - n.px[0], p[1] - n.px[1])), 0);
}

/* Every drawn stroke, with its length and where it sits. */
const drawn = [];
for (const p of file.paths) {
  const isEdge = /scene-(edge|spine|open)/.test(p.cls);
  for (const s of segments(p.d)) {
    const l = len(s);
    if (!l) continue;
    const m = mid(s);
    drawn.push({ s, l, m, opacity: p.opacity, cls: p.cls, isEdge, depth: p.depth, light: p.light });
  }
}

/* Which record, or which edge, a stroke belongs to -- from the geometry, not
   from anything the file says about itself. A form stroke sits within a form's
   own reach; an edge stroke sits on an edge's own line. */
/* A form's own segments, projected: the exact geometry `lib/forms.js` says the
   node draws. A drawn stroke that matches one of these belongs to that node and
   to nothing else, which matters where a topic's ring passes close to a
   diamond -- proximity alone would hand the ring's stroke to the diamond. The
   match is by endpoints within half a pixel, because the YAML rounds a world
   position to three places and a re-projection from it lands a tenth of a
   pixel away. */
const formSegs = [];
for (const n of data.nodes) {
  if (!n.px) continue;
  for (const seg of place(form(n.kind, n.size), n.p, v)) {
    const a = project(v, ASPECT, seg[0]);
    const b = project(v, ASPECT, seg[1]);
    if (!a || !b) continue;
    formSegs.push({ node: n, a: toPx(a), b: toPx(b) });
  }
}
const near = (p, q, tol) => Math.abs(p[0] - q[0]) < tol && Math.abs(p[1] - q[1]) < tol;
const exactOwner = (d) => {
  for (const f of formSegs) {
    if ((near(d.s[0], f.a, 0.6) && near(d.s[1], f.b, 0.6)) || (near(d.s[0], f.b, 0.6) && near(d.s[1], f.a, 0.6))) return f.node;
  }
  return null;
};

function nodeOwner(p) {
  let best = null;
  for (const n of data.nodes) {
    if (!n.px) continue;
    const d = Math.hypot(p[0] - n.px[0], p[1] - n.px[1]);
    if (d > n.rpx * 1.5) continue;
    const score = d - n.rpx;
    if (!best || score < best.score) best = { score, node: n };
  }
  return best ? best.node : null;
}

function edgeOwner(p) {
  let best = null;
  for (const e of data.edges) {
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    if (!a || !b || !a.px || !b.px) continue;
    const d = distanceToSegment(p, [a.px, b.px]);
    if (!best || d < best.d) best = { d, a, b, key: `${e.a} -> ${e.b}` };
  }
  if (!best || best.d > 7) return null;
  /* Depth along the edge, harmonic between its ends (the projection is affine
     in 1/z), read at the point nearest the stroke. */
  const ax = best.a.px[0];
  const ay = best.a.px[1];
  const dx = best.b.px[0] - ax;
  const dy = best.b.px[1] - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const inv = 1 / best.a.z + t * (1 / best.b.z - 1 / best.a.z);
  return { key: best.key, role: depthAt(C, 1 / inv), z: 1 / inv, a: best.a, b: best.b };
}

const roleInk = { highlight: { len: 0, weight: 0, n: 0 }, near: { len: 0, weight: 0, n: 0 }, mid: { len: 0, weight: 0, n: 0 }, far: { len: 0, weight: 0, n: 0 }, accent: { len: 0, weight: 0, n: 0 } };
const opacityValues = new Map();
const inkOfEdge = new Map();
const strokesOfNode = new Map();
const profile = Array.from({ length: 21 }, () => ({ len: 0, weight: 0 }));
let unattributed = 0;
for (const d of drawn) {
  const onEdge = /scene-(edge|spine|open)/.test(d.cls);
  const edge = onEdge ? edgeOwner(d.m) : null;
  const node = edge ? null : exactOwner(d) || nodeOwner(d.m);
  let role;
  if (edge) {
    role = edge.role;
    if (!inkOfEdge.has(edge.key)) inkOfEdge.set(edge.key, []);
    inkOfEdge.get(edge.key).push(d);
    d.edgeKey = edge.key;
  } else if (node) {
    role = node.role;
    if (!strokesOfNode.has(node.id)) strokesOfNode.set(node.id, []);
    strokesOfNode.get(node.id).push(d);
  } else {
    unattributed++;
    continue;
  }
  d.role = role;
  d.ownerKind = edge ? 'edge' : node.kind;
  roleInk[role].len += d.l;
  roleInk[role].weight += d.l * d.opacity;
  roleInk[role].n++;
  if (!edge && (node.kind === 'datum' || node.kind === 'unit')) {
    roleInk.accent.len += d.l;
    roleInk.accent.weight += d.l * d.opacity;
    roleInk.accent.n++;
  }
  const u = depthAt(C, edge ? edge.z : node.z) === 'highlight' ? 0 : 0;
  const bucketIndex = Math.min(20, Math.round(depthUnitOf(C, edge ? edge.z : node.z) * 20));
  profile[bucketIndex].len += d.l;
  profile[bucketIndex].weight += d.l * d.opacity;
  const key = d.opacity.toFixed(2);
  opacityValues.set(key, (opacityValues.get(key) || 0) + 1);
}

const totalLen = Object.values(roleInk).slice(0, 4).reduce((a, r) => a + r.len, 0);
const totalWeight = Object.values(roleInk).slice(0, 4).reduce((a, r) => a + r.weight, 0);

const values = {
  roles: Object.fromEntries(
    ['highlight', 'near', 'mid', 'far'].map((k) => {
      const r = roleInk[k];
      return [k, {
        strokes: r.n,
        length: round(r.len, 1),
        weight: round(r.weight, 1),
        meanOpacity: round(r.len ? r.weight / r.len : 0, 3),
        meanLength: round(r.n ? r.len / r.n : 0, 1),
        lengthShare: round(totalLen ? r.len / totalLen : 0, 3),
        weightShare: round(totalWeight ? r.weight / totalWeight : 0, 3),
      }];
    }),
  ),
  accent: {
    strokes: roleInk.accent.n,
    lengthShare: round(totalLen ? roleInk.accent.len / totalLen : 0, 3),
    weightShare: round(totalWeight ? roleInk.accent.weight / totalWeight : 0, 3),
  },
  ratios: {},
  distinctOpacity: [...opacityValues.entries()].sort((a, b) => b[1] - a[1]).map(([o, n]) => ({ opacity: +o, strokes: n })),
  unattributedStrokes: unattributed,
  /* Cumulative ink weight against the normalised depth scale: what share of
     the ink sits nearer than u. The ramp's own stops are read off this. */
  profile: profile.map((b, i) => ({ u: round(i / 20, 2), weight: round(b.weight, 1) })).reduce((acc, b) => {
    const prev = acc.length ? acc[acc.length - 1].cumulative : 0;
    acc.push({ ...b, cumulative: round(prev + (totalWeight ? b.weight / totalWeight : 0), 3) });
    return acc;
  }, []),
};
const meanOf = (k) => values.roles[k].meanOpacity;

const ratio = (a, b) => (meanOf(b) ? round(meanOf(a) / meanOf(b), 2) : null);
values.ratios.nearOverMid = ratio('near', 'mid');
values.ratios.midOverFar = ratio('mid', 'far');
values.ratios.nearOverFar = ratio('near', 'far');

/* --------------------------------------------------------- hidden lines */

/* Every edge is sampled along its own line. Where a sample falls inside a
   nearer diamond the pen must be lifted: the ink of *this* edge, found near
   the sample, is a violation. Where the sample is visible the ink of this edge
   should be there, which is the other half of the check -- a plate that hid
   everything would pass the first half and fail this one. Ink is matched to
   the edge it lies on, so another edge crossing the same diamond is not
   counted against this one. */
const STEP = 1.5;
const hidden = { samples: 0, runs: 0, violations: 0, visibleSamples: 0, covered: 0, edgesCrossing: [], byEdge: {}, coverage: {}, anyNodeRuns: 0, where: [] };
for (const e of data.edges) {
  const A = byId.get(e.a);
  const B = byId.get(e.b);
  if (!A || !B || !A.px || !B.px) continue;
  const key = `${e.a} -> ${e.b}`;
  const ink = inkOfEdge.get(key) || [];
  const L = Math.hypot(B.px[0] - A.px[0], B.px[1] - A.px[1]);
  const steps = Math.max(2, Math.ceil(L / STEP));
  let inRun = false;
  let runViolations = 0;
  let visible = 0;
  let covered = 0;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const px = A.px[0] + s * (B.px[0] - A.px[0]);
    const py = A.px[1] + s * (B.px[1] - A.px[1]);
    const z = 1 / (1 / A.z + s * (1 / B.z - 1 / A.z));
    const p = [px, py];
    const has = ink.some((d) => distanceToSegment(p, d.s) <= 1);
    let occludedNear = false;
    let occludedAny = false;
    let occludedBy = '';
    for (const n of data.nodes) {
      if (!n.px || !inside(p, n.poly)) continue;
      /* A form at one of this edge's own ends hides it whatever the depth tie:
         an edge that reaches the centre of its own diamond has crossed the
         silhouette it should have stopped at. */
      const atEnd = n.id === e.a || n.id === e.b;
      if (!atEnd && n.z >= z - 1e-6) continue;
      if (atEnd && n.kind !== 'repo' && n.kind !== 'unit' && n.kind !== 'datum' && n.kind !== 'journal') continue;
      occludedAny = true;
      if (n.kind === 'repo') { occludedNear = true; occludedBy = n.id; }
    }
    if (occludedAny && !inRun) hidden.anyNodeRuns++;
    const inEnd = (A.id !== e.a && A.id !== e.b ? false : false) || (A.poly && inside(p, A.poly)) || (B.poly && inside(p, B.poly));
    if (occludedNear) {
      hidden.samples++;
      if (!inRun) { hidden.runs++; inRun = true; }
      if (has) {
        hidden.violations++;
        runViolations++;
        if (!hidden.edgesCrossing.includes(key)) hidden.edgesCrossing.push(key);
        if (hidden.where.length < 8) hidden.where.push(`${key} inside ${occludedBy} at ${px.toFixed(0)},${py.toFixed(0)}`);
      }
    } else {
      inRun = false;
      hidden.visibleSamples++;
      if (has) hidden.covered++;
      if (!inEnd) {
        visible++;
        if (has) covered++;
      }
    }
  }
  hidden.byEdge[key] = { violations: runViolations, coverage: round(covered / Math.max(1, visible), 3), kind: e.kind };
}
hidden.coverage = round(hidden.covered / Math.max(1, hidden.visibleSamples), 3);
hidden.coverageSolid = round(
  Object.values(hidden.byEdge).filter((x) => x.kind !== 'open').reduce((a, x) => a + x.coverage, 0) /
    Math.max(1, Object.values(hidden.byEdge).filter((x) => x.kind !== 'open').length),
  3,
);

/* --------------------------------------------------------------- pitches */

/* Repeated small detail, at a rhythm -- detected, not declared. Two readings:

   detail    a short mark's distance to the next mark of its class. Rims, ticks,
             rungs and dashes all show up here, whatever their angle, because
             the pitch is the spacing, not the direction.
   parallel  the modal gap between parallel marks of one class: the carried
             rhythm of a run of rungs, where the marks are square to the same
             line.

   A plate with no small repeated detail has no pitch to find, which is what
   the before column shows. */
function modal(list) {
  if (list.length < 3) return null;
  const bins = new Map();
  for (const x of list) {
    const b = Math.round(x * 2) / 2;
    bins.set(b, (bins.get(b) || 0) + 1);
  }
  let top = null;
  for (const [b, n] of bins) if (!top || n > top.n || (n === top.n && b < top.b)) top = { b, n };
  if (!top || top.n < 3) return null;
  const at = list.filter((x) => Math.abs(x - top.b) <= 1).length;
  return { pitch: +top.b.toFixed(1), strokes: at, samples: list.length };
}

const short = drawn.filter((d) => d.l <= 16);
const byClass = new Map();
for (const d of short) {
  if (!byClass.has(d.cls)) byClass.set(d.cls, []);
  byClass.get(d.cls).push(d);
}
const detail = [];
for (const [cls, list] of byClass) {
  const nearest = [];
  for (const d of list) {
    let best = Infinity;
    for (const o of list) {
      if (o === d) continue;
      const g = Math.hypot(o.m[0] - d.m[0], o.m[1] - d.m[1]);
      if (g > 0.5 && g < best) best = g;
    }
    if (best < Infinity) nearest.push(best);
  }
  const m = modal(nearest);
  if (m && list.length >= 4) detail.push({ cls, pitch: m.pitch, strokes: list.length, marks: m.strokes });
}
detail.sort((a, b) => b.strokes - a.strokes);

const parallel = [];
{
  const groups = new Map();
  for (const d of drawn) {
    if (d.l < 4 || d.l > 40) continue;
    const ang = ((Math.atan2(d.s[1][1] - d.s[0][1], d.s[1][0] - d.s[0][0]) * 180) / Math.PI + 180) % 180;
    const k = `${d.cls}|${Math.round(ang / 2) * 2}`;
    if (!groups.has(k)) groups.set(k, []);
    const a = (ang * Math.PI) / 180;
    groups.get(k).push({ off: -Math.sin(a) * d.m[0] + Math.cos(a) * d.m[1], ang, cls: d.cls });
  }
  for (const [k, list] of groups) {
    if (list.length < 4) continue;
    const offs = list.map((x) => x.off).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < offs.length; i++) {
      const g = offs[i] - offs[i - 1];
      if (g >= 2) gaps.push(g);
    }
    const m = modal(gaps);
    if (m) parallel.push({ cls: list[0].cls.replace(/^.*\|/, ''), angle: list[0].ang, ...m });
  }
  parallel.sort((a, b) => b.strokes - a.strokes);
}

/* --------------------------------------------------------------- density */

function grid4(box) {
  const cells = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (const d of drawn) {
    const gx = Math.min(3, Math.max(0, Math.floor(((d.m[0] - box.x0) / (box.x1 - box.x0)) * 4)));
    const gy = Math.min(3, Math.max(0, Math.floor(((d.m[1] - box.y0) / (box.y1 - box.y0)) * 4)));
    cells[gy][gx] += d.l;
  }
  const flat = cells.flat();
  const sorted = [...flat].sort((a, b) => a - b);
  const empty = flat.filter((v) => v < 1).length;
  return {
    cells: cells.map((row) => row.map((x) => round(x, 0))),
    densest: round(Math.max(...flat), 0),
    emptiest: round(Math.min(...flat), 0),
    empties: empty,
    ratio: round(Math.min(...flat) > 0 ? Math.max(...flat) / Math.min(...flat) : Infinity, 1),
    p90p10: round(sorted[14] / Math.max(sorted[1], 1), 1),
  };
}
const xs = data.nodes.filter((n) => n.px).map((n) => n.px[0]);
const ys = data.nodes.filter((n) => n.px).map((n) => n.px[1]);
const inkBox = { x0: Math.min(...xs) - 30, x1: Math.max(...xs) + 30, y0: Math.min(...ys) - 30, y1: Math.max(...ys) + 30 };
let cx = 0;
let cy = 0;
let cw = 0;
for (const d of drawn) {
  cx += d.m[0] * d.l * d.opacity;
  cy += d.m[1] * d.l * d.opacity;
  cw += d.l * d.opacity;
}
const density = {
  centroid: { x: round(cx / cw, 0), y: round(cy / cw, 0), xNdc: round(((cx / cw) / VBW) * 2 - 1, 3) },
  plate: grid4(inkBox),
  frame: grid4({ x0: 0, y0: 0, x1: VBW, y1: VBH }),
  inkBox: { x0: round(inkBox.x0, 0), x1: round(inkBox.x1, 0), y0: round(inkBox.y0, 0), y1: round(inkBox.y1, 0) },
};

/* ------------------------------------------------------------- baselines */

const ADVANCE = LABEL_GRID.advance;
const labels = { grid: LABEL_GRID, rows: [], violations: [], kept: 0, total: file.texts.length, overflow: [] };
for (const t of file.texts) {
  const k = (t.y - LABEL_GRID.top) / LABEL_GRID.row;
  const off = Math.abs(k - Math.round(k)) * LABEL_GRID.row;
  const w = t.text.length * ADVANCE;
  const x0 = t.mid ? t.x - w / 2 : t.x;
  const x1 = x0 + w;
  const row = LABEL_GRID.top + Math.round(k) * LABEL_GRID.row;
  labels.rows.push({ text: t.text, y: t.y, row, off: round(off, 2) });
  if (off > 0.5) labels.violations.push({ text: t.text, y: t.y, off: round(off, 2) });
  if (x0 < 0 || x1 > VBW) labels.overflow.push({ text: t.text, x0: round(x0, 0), x1: round(x1, 0) });
}
labels.kept = file.texts.length;

/* ----------------------------------------------------------------- light */

/* Every closed form's faces. A form is lit or in shadow by the outward normal
   of each of its strokes against the stated azimuth, so a plate with one light
   has both faces on every form and the lit ones are always the ones facing the
   light. A form drawn at a single value has no light at all, whatever the
   picture looks like. */
const L = [Math.cos((LIGHT.azimuth * Math.PI) / 180), Math.sin((LIGHT.azimuth * Math.PI) / 180)];
const light = { forms: 0, flat: 0, lit: 0, shadow: 0, disagreeing: 0, disagreeingWhere: [], litOpacity: 0, litN: 0, shadowOpacity: 0, shadowN: 0 };
for (const [id, own] of strokesOfNode) {
  const n = byId.get(id);
  if (!n || !['repo', 'unit', 'topic', 'datum', 'journal'].includes(n.kind) || own.length < 2) continue;
  light.forms++;
  const distinct = new Set(own.map((d) => d.opacity.toFixed(2)));
  if (distinct.size < 2) light.flat++;
  for (const d of own) {
    /* The stroke's own outward normal, in the frame's plane: the pixel
       midpoint read back to the world at the form's depth, less the form's
       centre, projected on the view's axes. That is the same number
       `normalOf()` gives the renderer, so a second light cannot hide here. */
    const m = mid(d.s);
    const w = unproject(v, ASPECT, [(m[0] / VBW) * 2 - 1, 1 - (m[1] / VBH) * 2], n.z);
    const dx = w[0] - n.p[0];
    const dy = w[1] - n.p[1];
    const dz = w[2] - n.p[2];
    const nx = dx * v.x[0] + dy * v.x[1] + dz * v.x[2];
    const ny = dx * v.y[0] + dy * v.y[1] + dz * v.y[2];
    const l = Math.hypot(nx, ny) || 1;
    const dot = (nx / l) * L[0] + (ny / l) * L[1];
    const shouldBeLit = dot > LIGHT.threshold;
    /* The file's own state when it states one; otherwise the brighter half of
       the form is read as the lit half. */
    const isLit = d.light ? d.light === 'lit' : d.opacity >= Math.max(...own.map((x) => x.opacity));
    if (isLit) { light.lit++; light.litOpacity += d.opacity; light.litN++; } else { light.shadow++; light.shadowOpacity += d.opacity; light.shadowN++; }
    if (d.light && isLit !== shouldBeLit) {
      light.disagreeing++;
      if (light.disagreeingWhere.length < 6) light.disagreeingWhere.push(`${n.id} dot ${dot.toFixed(2)} ${d.light}`);
    }
  }
}
light.litOpacity = round(light.litOpacity / Math.max(1, light.litN), 3);
light.shadowOpacity = round(light.shadowOpacity / Math.max(1, light.shadowN), 3);
light.litOverShadow = light.shadowN ? round(light.litOpacity / light.shadowOpacity, 2) : null;

/* ----------------------------------------------------------------- gates */

const gates = [];
const gate = (name, problems) => gates.push({ name, ok: problems.length === 0, problems: problems.slice(0, 6), count: problems.length });

gate('hidden lines', hidden.violations ? [`${hidden.violations} samples of an edge inside a nearer diamond still have ink: ${hidden.where.join('; ')}`] : []);
gate('label baseline', labels.violations.map((v) => `${v.text} is ${v.off}px off its row`));
gate('label frame', labels.overflow.map((v) => `${v.text} runs ${v.x1 > VBW ? 'past the right edge' : 'past the left edge'} (${v.x0}..${v.x1} of ${VBW})`));
gate('one light', [
  ...(light.flat ? [`${light.flat} of ${light.forms} form(s) are drawn at one value`] : []),
  ...(light.disagreeing ? [`${light.disagreeing} stroke(s) lit against the stated azimuth: ${light.disagreeingWhere.join('; ')}`] : []),
  ...(light.litOverShadow === null ? ['no shadowed face anywhere'] : light.litOverShadow < 1.2 ? [`lit faces are only ${light.litOverShadow}x the shadowed ones`] : []),
]);

/* Geometry gates: the same three the generator enforces, computed here from
   the data so a hand-edited YAML is caught too. */
const MARGIN = 0.035;
const problemsFrame = [];
const problemsBand = [];
for (const aspect of [ASPECT, 420 / 828]) {
  const floor = aspect === ASPECT ? 0.02 : -0.12;
  for (const yaw of [-C.yaw, 0, C.yaw]) for (const pitch of [-C.pitch, 0, C.pitch]) for (const dolly of C.dolly) {
    const pv = view(state(C, { yaw, pitch, dolly }));
    for (const n of data.nodes) {
      const q = project(pv, aspect, n.p);
      if (!q) { problemsFrame.push(`${n.id} is behind the camera`); continue; }
      const rx = (n.size * 190.3) / 720;
      const ry = (n.size * 190.3) / 396;
      if (Math.abs(q[0]) + rx > 1 - MARGIN || q[1] + ry > 1 - MARGIN) problemsFrame.push(`${n.id} leaves the frame at ${aspect.toFixed(2)}`);
      if (q[1] - ry < floor) problemsBand.push(`${n.id} falls into the type band at ${aspect.toFixed(2)}`);
    }
  }
}
gate('frame', [...new Set(problemsFrame)]);
gate('type band', [...new Set(problemsBand)]);

const problemsOverlap = [];
for (let i = 0; i < data.nodes.length; i++) for (let j = i + 1; j < data.nodes.length; j++) {
  const a = data.nodes[i];
  const b = data.nodes[j];
  if (!a.px || !b.px) continue;
  const d = Math.hypot(a.px[0] - b.px[0], a.px[1] - b.px[1]) * (1440 / VBW);
  const need = (a.size + b.size) * 190.3 + 6;
  if (d < need) problemsOverlap.push(`${a.id} and ${b.id} overlap: ${round(d, 1)}px apart, ${round(need, 1)}px needed`);
}
gate('form overlap', problemsOverlap);

const problemsLabels = [];
for (let i = 0; i < file.texts.length; i++) for (let j = i + 1; j < file.texts.length; j++) {
  const a = file.texts[i];
  const b = file.texts[j];
  const wa = a.text.length * ADVANCE;
  const wb = b.text.length * ADVANCE;
  const ax = a.mid ? a.x - wa / 2 : a.x;
  const bx = b.mid ? b.x - wb / 2 : b.x;
  if (ax < bx + wb && ax + wa > bx && a.y - LABEL_GRID.cap < b.y && a.y > b.y - LABEL_GRID.cap) {
    problemsLabels.push(`${a.text} and ${b.text} are on each other`);
  }
}
gate('label overlap', problemsLabels);

const problemsEdge = [];
for (const e of data.edges) for (const end of [e.a, e.b]) if (!byId.has(end)) problemsEdge.push(`edge ${e.a} -> ${e.b} names ${end}, which is not on the map`);
gate('unknown edge', problemsEdge);

/* ---------------------------------------------------------------- report */

const out = {
  label,
  svg: svgPath,
  viewBox: { w: VBW, h: VBH },
  strokes: { total: drawn.length, edgePieces: drawn.filter((d) => d.isEdge).length, forms: drawn.filter((d) => !d.isEdge).length },
  hidden,
  values,
  pitches: { detail: detail.slice(0, 8), parallel: parallel.slice(0, 8) },
  distinctPitches: detail.length,
  density,
  baselines: labels,
  light,
  gates,
};
out.ok = gates.every((g) => g.ok);

const pad = (s, n) => String(s).padEnd(n);
if (!jsonOut) {
  console.log(`\n  ${label}: ${svgPath.split(/[\\/]/).pop()}`);
  console.log(`  strokes ${drawn.length} (${out.strokes.edgePieces} edge pieces, ${out.strokes.forms} form strokes), ${unattributed} unattributed`);
  console.log(`\n  hidden lines     ${hidden.violations} violating samples over ${hidden.runs} hidden runs; ${hidden.edgesCrossing.length} edges cross a diamond`);
  console.log(`  coverage         ${round((hidden.covered / Math.max(1, hidden.visibleSamples)) * 100, 1)}% of the visible edge length has ink; ${round(hidden.coverageSolid * 100, 1)}% on the solid edges`);
  console.log(`  occluders        ${hidden.runs} diamond run(s), ${hidden.anyNodeRuns} runs under any form`);
  console.log(`\n  role      strokes   length  weight  meanOp  len%  ink%`);
  for (const k of ['highlight', 'near', 'mid', 'far']) {
    const r = values.roles[k];
    console.log(`  ${pad(k, 9)} ${pad(r.strokes, 9)} ${pad(r.length, 8)} ${pad(r.weight, 7)} ${pad(r.meanOpacity, 7)} ${pad(round(r.lengthShare * 100, 1), 5)} ${round(r.weightShare * 100, 1)}`);
  }
  console.log(`  accent    ${pad(values.accent.strokes, 9)} ${''.padEnd(8)} ${''.padEnd(7)} ${''.padEnd(7)} ${pad(round(values.accent.lengthShare * 100, 1), 5)} ${round(values.accent.weightShare * 100, 1)}`);
  console.log(`  ratios    near/mid ${values.ratios.nearOverMid}, mid/far ${values.ratios.midOverFar}, near/far ${values.ratios.nearOverFar}`);
  console.log(`  opacity values   ${values.distinctOpacity.map((o) => `${o.opacity}x${o.strokes}`).join(' ')}`);
  console.log(`\n  repeated detail, by the gap to the next mark of the class`);
  for (const p of detail.slice(0, 8)) console.log(`    ${pad(p.cls, 14)} ${String(p.pitch).padStart(6)}px  ${p.strokes} marks, ${p.marks} at the pitch`);
  if (!detail.length) console.log('    none: no repeated small detail at any pitch');
  if (parallel.length) console.log(`  parallel runs    ${parallel.slice(0, 4).map((d) => `${d.pitch}px x${d.strokes} (${d.cls} at ${d.angle}deg)`).join(', ')}`);
  console.log(`\n  density 4x4 over the plate (ink length per cell)`);
  for (const row of density.plate.cells) console.log(`    ${row.map((v) => String(v).padStart(6)).join('')}`);
  console.log(`    densest ${density.plate.densest}, emptiest ${density.plate.emptiest}, ratio ${density.plate.ratio}, p90/p10 ${density.plate.p90p10}, ${density.plate.empties} empty cell(s)`);
  console.log(`  density 4x4 over the frame: ratio ${density.frame.ratio}, ${density.frame.empties} empty cell(s)`);
  console.log(`  ink centroid     x ${density.centroid.x} (${density.centroid.xNdc} in ndc, 0 is the frame's centre), y ${density.centroid.y}`);
  console.log(`\n  labels   ${labels.kept} kept on grid rows at ${LABEL_GRID.top} + k*${LABEL_GRID.row}px`);
  console.log(`    violations ${labels.violations.length}${labels.violations.length ? ': ' + labels.violations.map((v) => `${v.text} ${v.off}px`).join(', ') : ''}`);
  if (labels.overflow.length) console.log(`    overflow   ${labels.overflow.map((v) => `${v.text} ${v.x0}..${v.x1}`).join(', ')}`);
  console.log(`\n  light    ${LIGHT.azimuth}deg, ${light.lit} lit / ${light.shadow} shadow strokes over ${light.forms} forms; lit ${light.litOpacity}, shadow ${light.shadowOpacity} (${light.litOverShadow}x); ${light.disagreeing} disagree with the azimuth`);
  console.log(`\n  gates`);
  for (const g of gates) console.log(`    ${g.ok ? 'PASS' : 'FAIL'}  ${pad(g.name, 15)}${g.count ? g.count + ' problem(s): ' + g.problems.join('; ') : ''}`);
  console.log(`\n  ${out.ok ? 'the plate passes every gate' : 'THE PLATE FAILS A GATE'}\n`);
}
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(out, null, 2) + '\n');
  console.log(`  wrote ${jsonOut}`);
}
process.exitCode = out.ok ? 0 : 1;
