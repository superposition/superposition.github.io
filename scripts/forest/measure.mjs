#!/usr/bin/env node
/* Measure the bear: the numbers the craft pass was argued with.

     node scripts/forest/measure.mjs --url http://127.0.0.1:4181/forest/        --out DIR --tag after

   It is not part of the build and the site never loads it. It drives the real
   page in headless Chrome and reports nothing but arithmetic:

     * the rig, part by part and form by form, measured off the merged triangle
       arrays in the bear's own space, never off the table in bear.js;
     * value, read back out of the 320 x 240 framebuffer with gl.readPixels:
       the luminance histogram, the share of the surface in the light band, and
       the mean value of each part and each form through a ray-cast mask;
     * the silhouette at 32 pixels wide, and how many of its cells hold two
       tones;
     * the face, for every station and every frame of every hop between them:
       the pupils and the nose projected through the scene's own camera, their
       planes against the view, and whether the first thing the ray from the
       camera hits is the pupil itself (unoccluded) or the head in front of it;
     * motion, frame by frame: squash, stretch, settle, ear and tail lag by
       cross-correlation, blink rate, and the yaw travel of every hop;
     * ground clearance, against a downward ray onto the floor.

   Requirements: `puppeteer-core` and a Chromium build. Neither is a dependency
   of the site, so this script has to be run from a directory where
   `puppeteer-core` resolves (`npm i puppeteer-core`), or copied there; its own
   paths are all arguments. CHROME below is the build the pass was made with;
   override it with CHROME_PATH.

   Renders: the same run writes the canvas at 320 and 640, and the 32-pixel
   silhouette, so a claim about the picture has a picture beside it. */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CHROME = process.env.CHROME_PATH || 'C:/Users/ericm/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
    return acc;
  }, []),
);
const URL_ = args.url || 'http://127.0.0.1:4181/forest/';
const OUT = args.out || '.';
const TAG = args.tag || 'run';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL_, { waitUntil: 'networkidle0', timeout: 120000 });
await page.click('[data-forest-wake]');
await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });

const inPage = await page.evaluate(() => {
  const f = window.__forest;
  f.pause();
  const dbg = f.debug();
  const bear = dbg.bear;
  const camera = dbg.camera;
  const scene = dbg.scene;
  bear.root.updateMatrixWorld(true);

  const el = (m) => m.elements;
  const xf = (m, x, y, z) => [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];

  const meshes = [];
  bear.root.traverse((o) => {
    if (o.isMesh) meshes.push({ mesh: o, label: o.parent?.name || 'mesh', forms: [] });
  });
  const manifest = bear.manifest || [];
  // by name, not by index: a group's children are added in animation order and
  // that is not necessarily the order the parts were built in
  meshes.forEach((m) => {
    const entry = manifest.find((e) => e.part.replace(/ /g, '') === m.label);
    m.forms = entry?.forms ?? [];
  });

  // Every bear triangle, in the mesh's own space, with part, form and role.
  // World positions are re-baked for every pose: the animal moves, so a
  // triangle baked once is only true of the frame it was baked in.
  const localTris = [];
  meshes.forEach(({ mesh, label, forms }) => {
    const g = mesh.geometry;
    const p = g.attributes.position;
    const c = g.attributes.color;
    let local = 0;
    for (let i = 0; i < p.count; i += 3) {
      const v = [];
      for (let k = 0; k < 3; k += 1) {
        const j = i + k;
        v.push([p.getX(j), p.getY(j), p.getZ(j)]);
      }
      const form = forms.find((x) => local >= x.first && local < x.first + x.count);
      localTris.push({
        mesh, label, form: form?.name ?? null, role: form?.role ?? null, local: v,
        c: [c.getX(i), c.getY(i), c.getZ(i)],
      });
      local += 1;
    }
  });

  let triangles = [];
  const bake = () => {
    bear.root.updateMatrixWorld(true);
    triangles = localTris.map((t, index) => {
      const m = t.mesh.matrixWorld.elements;
      const v = t.local.map((q) => xf(m, q[0], q[1], q[2]));
      const u = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]];
      const w = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const len = Math.hypot(n[0], n[1], n[2]) || 1;
      return {
        i: index, part: t.label, form: t.form, role: t.role, v, c: t.c,
        n: [n[0] / len, n[1] / len, n[2] / len],
      };
    });
    return triangles;
  };

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const bbox = (pts) => {
    const mn = [Infinity, Infinity, Infinity];
    const mx = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) for (let k = 0; k < 3; k += 1) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    return { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  };

  /* Parts and forms are measured in the bear's own frame at the rest pose:
     the groups carry the joints, so a triangle's own space is not the animal's
     space, and a ratio between two parts has to share one origin. */
  bear.apply({});
  bear.root.updateMatrixWorld(true);
  const rootInv = bear.root.matrixWorld.clone().invert().elements;
  const toBear = (t, v) => {
    const m = t.mesh.matrixWorld.elements;
    const w = xf(m, v[0], v[1], v[2]);
    return xf(rootInv, w[0], w[1], w[2]);
  };
  const partsRoot = {};
  for (const t of localTris) {
    (partsRoot[t.label] ??= []).push(...t.local.map((v) => toBear(t, v)));
  }
  const allRootPts = localTris.flatMap((t) => t.local.map((v) => toBear(t, v)));
  const parts = {};
  for (const [k, pts] of Object.entries(partsRoot)) parts[k] = bbox(pts);
  const allRoot = bbox(allRootPts);

  // forms: geometry in the bear's own space, so a ratio is a ratio of the mesh
  const forms = {};
  for (const t of localTris) {
    if (!t.form) continue;
    const key = `${t.label}/${t.form}`;
    (forms[key] ??= { part: t.label, name: t.form, role: t.role, pts: [], tris: 0, colours: {} });
    forms[key].pts.push(...t.local.map((v) => toBear(t, v)));
    forms[key].tris += 1;
    const ck = t.c.map((x) => x.toFixed(3)).join(',');
    forms[key].colours[ck] = (forms[key].colours[ck] ?? 0) + 1;
  }
  for (const v of Object.values(forms)) {
    v.box = bbox(v.pts);
    v.centre = v.pts.reduce((a, p) => [a[0] + p[0] / v.pts.length, a[1] + p[1] / v.pts.length, a[2] + p[2] / v.pts.length], [0, 0, 0]);
    delete v.pts;
  }

  function hit(origin, dir) {
    let best = Infinity; let bestTri = null;
    for (const t of triangles) {
      const e1 = sub(t.v[1], t.v[0]);
      const e2 = sub(t.v[2], t.v[0]);
      const pv = cross(dir, e2);
      const det = dot(e1, pv);
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det;
      const tv = sub(origin, t.v[0]);
      const u = dot(tv, pv) * inv;
      if (u < -1e-6 || u > 1 + 1e-6) continue;
      const qv = cross(tv, e1);
      const v = dot(dir, qv) * inv;
      if (v < -1e-6 || u + v > 1 + 1e-6) continue;
      const dist = dot(e2, qv) * inv;
      if (dist > 1e-4 && dist < best) { best = dist; bestTri = t; }
    }
    return { dist: best, tri: bestTri };
  }

  const cam = camera;
  const rayFor = (px, py) => {
    const ndcX = (px + 0.5) / 320 * 2 - 1;
    const ndcY = 1 - (py + 0.5) / 240 * 2;
    const p = cam.position.clone().set(ndcX, ndcY, 0.5).unproject(cam);
    return { origin: cam.position.toArray(), dir: norm(sub(p.toArray(), cam.position.toArray())) };
  };
  const project = (pt) => {
    const v = cam.position.clone().set(pt[0], pt[1], pt[2]).project(cam);
    return { x: v.x, y: v.y, z: v.z, px: (v.x + 1) / 2 * 320, py: (1 - v.y) / 2 * 240 };
  };

  /* The face: the two pupils and the nose, taken from the manifest. The pupils
     are flat ovals, so their own normal is exactly the direction the eye looks;
     the nose is a sphere, so its normal is the face of it that points out. Both
     are recomputed after every bake, because the head moves. */
  const formTriangles = (part, name) => triangles.filter((t) => t.form === name && (part === null || t.part === part));
  const faceGeometry = () => {
    const eyes = [
      formTriangles(null, 'near pupil'),
      formTriangles(null, 'far pupil'),
    ].map((tris, index) => {
      const pts = tris.flatMap((t) => t.v);
      const centre = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
      const normal = norm(tris.reduce((a, t) => [a[0] + t.n[0], a[1] + t.n[1], a[2] + t.n[2]], [0, 0, 0]));
      return { centre, normal, point: centre, form: index === 0 ? 'near pupil' : 'far pupil' };
    });
    const noseTris = formTriangles(null, 'nose');
    const nosePts = noseTris.flatMap((t) => t.v);
    const noseCentre = nosePts.reduce((a, p) => [a[0] + p[0] / nosePts.length, a[1] + p[1] / nosePts.length, a[2] + p[2] / nosePts.length], [0, 0, 0]);
    const skullTris = formTriangles(null, 'skull');
    const skullPts = skullTris.flatMap((t) => t.v);
    const skullCentre = skullPts.reduce((a, p) => [a[0] + p[0] / skullPts.length, a[1] + p[1] / skullPts.length, a[2] + p[2] / skullPts.length], [0, 0, 0]);
    const out = norm(sub(noseCentre, skullCentre));
    const front = noseTris.filter((t) => dot(t.n, out) > 0.35);
    const normal = norm((front.length ? front : noseTris).reduce((a, t) => [a[0] + t.n[0], a[1] + t.n[1], a[2] + t.n[2]], [0, 0, 0]));
    // a point on the surface of the nose, facing the camera side
    let point = noseCentre;
    let best = -Infinity;
    for (const t of noseTris) {
      const cen = [0, 1, 2].map((k) => (t.v[0][k] + t.v[1][k] + t.v[2][k]) / 3);
      const score = dot(t.n, norm(sub(cen, noseCentre))) - 0.3 * Math.hypot(...sub(cen, noseCentre));
      if (dot(t.n, out) > 0.2 && score > best) { best = score; point = cen; }
    }
    return { eyes, nose: { centre: noseCentre, normal, point } };
  };

  const faceCheck = () => {
    bake();
    cam.updateMatrixWorld(true);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const geo = faceGeometry();
    const out = {};
    const origin = cam.position.toArray();
    const d0 = Math.hypot(...sub(geo.eyes[0].centre, origin));
    const d1 = Math.hypot(...sub(geo.eyes[1].centre, origin));
    const pairs = d0 <= d1 ? [['eyeNear', geo.eyes[0]], ['eyeFar', geo.eyes[1]]] : [['eyeNear', geo.eyes[1]], ['eyeFar', geo.eyes[0]]];
    for (const [name, c, expected] of [...pairs.map(([n, v]) => [n, v, v.form]), ['nose', geo.nose, 'nose']]) {
      const dir = norm(sub(c.point, origin));
      const h = hit(origin, dir);
      h.expected = expected;
      const toPoint = Math.hypot(...sub(c.point, origin));
      const view = norm(sub(origin, c.point));
      const pr = project(c.point);
      const num = (v) => (Number.isFinite(v) ? +v.toFixed(3) : null);
      out[name] = {
        inFrame: Number.isFinite(pr.x) && Number.isFinite(pr.y) && Math.abs(pr.x) < 1 && Math.abs(pr.y) < 1,
        px: Number.isFinite(pr.px) ? +pr.px.toFixed(1) : null,
        py: Number.isFinite(pr.py) ? +pr.py.toFixed(1) : null,
        dist: num(toPoint),
        hitDist: Number.isFinite(h.dist) ? +h.dist.toFixed(3) : null,
        hitForm: h.tri?.form ?? null,
        hitPart: h.tri?.part ?? null,
        unoccluded: h.tri ? (h.expected === null || h.tri.form === h.expected || h.tri.part === h.expected) && Math.abs(h.dist - toPoint) < 0.2 : false,
        normalDotView: num(dot(c.normal, view)),
      };
    }
    return out;
  };

  const series = (steps, dt) => {
    const rows = [];
    for (let s = 0; s < steps; s += 1) {
      f.step(dt);
      bear.root.updateMatrixWorld(true);
      const part = (n) => bear.parts[n];
      rows.push({
        t: s * dt,
        rootY: +bear.root.position.y.toFixed(4),
        yaw: +bear.root.rotation.y.toFixed(4),
        bob: +bear.parts.hips.position.y.toFixed(4),
        scaleY: +bear.parts.hips.scale.y.toFixed(4),
        headX: +part('head').rotation.x.toFixed(4),
        earLX: +part('earL').rotation.x.toFixed(4),
        earRX: +part('earR').rotation.x.toFixed(4),
        legLX: +part('legL').rotation.x.toFixed(4),
        tailX: +part('tail').rotation.x.toFixed(4),
        eyesY: +(bear.parts.eyes ? bear.parts.eyes.scale.y : 1).toFixed(4),
        face: faceCheck(),
      });
    }
    return rows;
  };

  // the settled still at station 0: every picture measurement is this frame
  f.show(0, { instant: true });
  for (let s = 0; s < 20; s += 1) f.step(16);
  f.render();
  const stillFace = faceCheck();

  // the hop in place, at a station that owns it (gestureFor(i) === 4)
  let hopStation = 0;
  for (let i = 0; i < 20; i += 1) if ((i * 4) % 9 === 4) { hopStation = i; break; }
  f.show(hopStation, { instant: true });
  const gestureRows = series(120, 16);

  // a path hop, one frame per 16 ms, with the camera where it actually is
  f.show(hopStation, { instant: true });
  for (let s = 0; s < 12; s += 1) f.step(16);
  window.__forest.show(hopStation + 1);
  const hopRows = series(52, 16);

  // blink on its own clock: no gesture, 20 s of steps
  f.show(0, { instant: true });
  for (let s = 0; s < 40; s += 1) f.step(16);
  const blinkRows = [];
  for (let s = 0; s < 1250; s += 1) {
    f.step(16);
    blinkRows.push(+(bear.parts.eyes ? bear.parts.eyes.scale.y : 1).toFixed(3));
  }

  // face visibility over every station and every hop between them
  const poseChecks = [];
  for (let i = 0; i < 20; i += 1) {
    f.show(i, { instant: true });
    for (let s = 0; s < 8; s += 1) f.step(16);
    poseChecks.push({ pose: `station ${i}`, face: faceCheck() });
    if (i < 19) {
      window.__forest.show(i + 1);
      for (let s = 0; s < 40; s += 1) {
        f.step(16);
        if (s % 4 === 0) poseChecks.push({ pose: `hop ${i}->${i + 1} @${s * 16}ms`, face: faceCheck() });
      }
      f.show(i + 1, { instant: true });
    }
  }

  // yaw travel per hop: the spin symptom
  const yawTravel = [];
  for (let i = 0; i < 19; i += 1) {
    f.show(i, { instant: true });
    for (let s = 0; s < 6; s += 1) f.step(16);
    window.__forest.show(i + 1);
    let mn = Infinity; let mx = -Infinity; let prev = bear.root.rotation.y; let total = 0;
    for (let s = 0; s < 40; s += 1) {
      f.step(16);
      const y = bear.root.rotation.y;
      total += Math.abs(Math.atan2(Math.sin(y - prev), Math.cos(y - prev)));
      prev = y;
      mn = Math.min(mn, y); mx = Math.max(mx, y);
    }
    yawTravel.push({ hop: `${i}->${i + 1}`, span: +(mx - mn).toFixed(3), path: +total.toFixed(3) });
  }

  // the picture at station 0
  f.show(0, { instant: true });
  for (let s = 0; s < 20; s += 1) f.step(16);
  const withBear = f.grab();
  bear.root.visible = false;
  const withoutBear = f.grab();
  bear.root.visible = true;
  f.render();

  bake();
  const partId = [];
  const formId = [];
  const triId = [];
  for (let y = 0; y < 240; y += 2) {
    for (let x = 0; x < 320; x += 2) {
      const { origin, dir } = rayFor(x, y);
      const h = hit(origin, dir);
      partId.push(h.tri ? h.tri.part : null);
      formId.push(h.tri?.form ?? null);
      triId.push(h.tri ? h.tri.i : -1);
    }
  }

  // ground clearance: the farthest downward hit under the bear, which is the
  // floor and not a tree
  const groundY = (() => {
    const save = bear.root.visible;
    bear.root.visible = false;
    scene.updateMatrixWorld(true);
    const world = [];
    scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      const g = o.geometry; const p = g.attributes.position; if (!p) return;
      const m = el(o.matrixWorld);
      for (let i = 0; i < p.count; i += 3) {
        world.push([0, 1, 2].map((k) => xf(m, p.getX(i + k), p.getY(i + k), p.getZ(i + k))));
      }
    });
    bear.root.visible = save;
    const o = [bear.root.position.x, 20, bear.root.position.z];
    let best = -Infinity;
    for (const t of world) {
      const e1 = sub(t[1], t[0]); const e2 = sub(t[2], t[0]);
      const dir = [0, -1, 0];
      const pv = cross(dir, e2); const det = dot(e1, pv);
      if (Math.abs(det) < 1e-9) continue;
      const inv = 1 / det; const tv = sub(o, t[0]);
      const u = dot(tv, pv) * inv; if (u < 0 || u > 1) continue;
      const qv = cross(tv, e1); const v = dot(dir, qv) * inv; if (v < 0 || u + v > 1) continue;
      const dist = dot(e2, qv) * inv;
      if (dist > 0 && dist > best) best = dist;
    }
    return best === -Infinity ? null : 20 - best;
  })();

  bake();
  const footY = Math.min(...triangles.map((t) => Math.min(t.v[0][1], t.v[1][1], t.v[2][1])));

  return {
    stats: f.stats(),
    parts,
    allRoot,
    forms,
    stillFace,
    poseChecks,
    gestureRows,
    hopRows,
    blinkRows,
    yawTravel,
    mask: { partId, formId, triId, cols: 160, rows: 120 },
    triColours: triangles.map((t) => t.c),
    pixels: { withBear, withoutBear },
    clearance: { footY, groundY, rootY: bear.root.position.y },
  };
});

/* ---------------------------------------------------------------- in node */
const { cols, rows, partId, formId, triId } = inPage.mask;
const px = { with: inPage.pixels.withBear, without: inPage.pixels.withoutBear };
const W = 320; const H = 240;
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const bearPixels = [];
for (let i = 0; i < W * H; i += 1) {
  const a = i * 4;
  const d = Math.abs(px.with[a] - px.without[a]) + Math.abs(px.with[a + 1] - px.without[a + 1]) + Math.abs(px.with[a + 2] - px.without[a + 2]);
  if (d > 6) bearPixels.push({ i, x: i % W, y: Math.floor(i / W), r: px.with[a], g: px.with[a + 1], b: px.with[a + 2], l: lum(px.with[a], px.with[a + 1], px.with[a + 2]) });
}
const coverage = bearPixels.length / (W * H);
let bx0 = W; let bx1 = 0; let by0 = H; let by1 = 0;
for (const p of bearPixels) { bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); by0 = Math.min(by0, p.y); by1 = Math.max(by1, p.y); }
const set = new Set(bearPixels.map((p) => `${p.x},${p.y}`));

const sortedL = bearPixels.map((p) => p.l).sort((a, b) => a - b);
const q = (k) => sortedL[Math.floor((sortedL.length - 1) * k)] ?? 0;
const hist = new Array(256).fill(0);
for (const p of bearPixels) hist[Math.round(p.l)] += 1;
const peaks = [];
for (let v = 1; v < 255; v += 1) {
  if (hist[v] >= 6 && hist[v] > hist[v - 1] && hist[v] >= hist[v + 1]) peaks.push({ value: v, pixels: hist[v] });
}
peaks.sort((a, b) => b.pixels - a.pixels);

const stats = (v) => {
  const s = v.slice().sort((a, b) => a - b);
  return { pixels: v.length, mean: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1), p10: +s[Math.floor(v.length * 0.1)].toFixed(1), p90: +s[Math.floor(v.length * 0.9)].toFixed(1) };
};

// the two-tone break: the same form, split by the colour it was painted
const colourKey = (c) => c.map((x) => x.toFixed(3)).join(',');
const byColour = {};
for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
  const t = triId[j * cols + i]; if (t < 0) continue;
  const o = (j * 2 * W + i * 2) * 4;
  const key = `${formId[j * cols + i]}#${colourKey(inPage.triColours[t])}`;
  (byColour[key] ??= []).push(lum(px.with[o], px.with[o + 1], px.with[o + 2]));
}
const colourLuma = Object.fromEntries(Object.entries(byColour).map(([k, v]) => [k, stats(v)]));

// value roles: mean rendered luminance by the manifest's role name
const byRole = {};
const byForm = {};
for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
  const part = partId[j * cols + i]; if (!part) continue;
  const o = (j * 2 * W + i * 2) * 4;
  const l = lum(px.with[o], px.with[o + 1], px.with[o + 2]);
  (byRole[part] ??= []).push(l);
  const fm = formId[j * cols + i];
  if (fm) (byForm[fm] ??= []).push(l);
}
const partLuma = Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, stats(v)]));
const formLuma = Object.fromEntries(Object.entries(byForm).map(([k, v]) => [k, stats(v)]));

// 32 px wide silhouette, from the bear's own bounding box
const scale = 32 / (bx1 - bx0 + 1);
const s32 = [];
for (let j = 0; j < Math.max(1, Math.round((by1 - by0 + 1) * scale)); j += 1) {
  const row = [];
  for (let i = 0; i < 32; i += 1) {
    const x0 = bx0 + Math.floor(i / scale); const x1 = bx0 + Math.max(Math.floor(i / scale) + 1, Math.ceil((i + 1) / scale));
    const y0 = by0 + Math.floor(j / scale); const y1 = by0 + Math.max(Math.floor(j / scale) + 1, Math.ceil((j + 1) / scale));
    let n = 0; let t = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { t += 1; if (set.has(`${x},${y}`)) n += 1; }
    row.push(t ? n / t : 0);
  }
  s32.push(row);
}
/* Two-tone at 32 px: how many of the filled cells hold two different value
   populations — the belly or the muzzle holding against the body. Counted as a
   cell with at least 35 % of its bear pixels on each side of the animal's median
   luminance. */
const med = q(0.5);
const tones32 = [];
for (let j = 0; j < Math.max(1, Math.round((by1 - by0 + 1) * scale)); j += 1) {
  for (let i = 0; i < 32; i += 1) {
    const x0 = bx0 + Math.floor(i / scale); const x1 = bx0 + Math.max(Math.floor(i / scale) + 1, Math.ceil((i + 1) / scale));
    const y0 = by0 + Math.floor(j / scale); const y1 = by0 + Math.max(Math.floor(j / scale) + 1, Math.ceil((j + 1) / scale));
    let light = 0; let dark = 0; let total = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
      if (!set.has(`${x},${y}`)) continue;
      total += 1;
      const o = (y * W + x) * 4;
      if (lum(px.with[o], px.with[o + 1], px.with[o + 2]) > med) light += 1; else dark += 1;
    }
    if (total && light / total >= 0.35 && dark / total >= 0.35) tones32.push(`${i},${j}`);
  }
}

// the mark hue: brown pixels against cream ones, at the bear's own resolution
const hueOf = (r, g, b) => Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b);
const markPixels = bearPixels.filter((p) => {
  const mx = Math.max(p.r, p.g, p.b); const mn = Math.min(p.r, p.g, p.b);
  return mx > 20 && (mx - mn) / mx > 0.24 && p.r > p.b + 12;
});
const markShare = markPixels.length / bearPixels.length;
const roleOf = {};
for (const v of Object.values(inPage.forms)) roleOf[`${v.part}/${v.name}`] = v.role;
const rolePixels = {};
for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
  const part = partId[j * cols + i]; if (!part) continue;
  rolePixels[part] = (rolePixels[part] ?? 0) + 1;
}
const totalSample = Object.values(rolePixels).reduce((a, b) => a + b, 0);
const markRoleShare = (() => {
  // the share of the animal's visible area painted in the mark hue: the belly,
  // the muzzle and the pads, found by reading their colour, not their name
  let n = 0;
  for (let j = 0; j < rows; j += 1) for (let i = 0; i < cols; i += 1) {
    if (!partId[j * cols + i]) continue;
    const o = (j * 2 * W + i * 2) * 4;
    const r = px.with[o]; const g = px.with[o + 1]; const b = px.with[o + 2];
    if (r > b + 18 && r > 60) n += 1;
  }
  return n / totalSample;
})();

// density gradient: edge density per 32 x 30 cell
const lumaFrame = [];
for (let i = 0; i < W * H; i += 1) lumaFrame.push(lum(px.with[i * 4], px.with[i * 4 + 1], px.with[i * 4 + 2]));
const edge = [];
for (let cy = 0; cy < 8; cy += 1) {
  const row = [];
  for (let cx = 0; cx < 10; cx += 1) {
    let n = 0;
    for (let y = cy * 30 + 1; y < (cy + 1) * 30; y += 1) for (let x = cx * 32 + 1; x < (cx + 1) * 32; x += 1) {
      const i = y * W + x;
      if (Math.abs(lumaFrame[i] - lumaFrame[i - 1]) > 10 || Math.abs(lumaFrame[i] - lumaFrame[i - W]) > 10) n += 1;
    }
    row.push(+(n / (30 * 32)).toFixed(4));
  }
  edge.push(row);
}

// motion
const rowsOf = (r, k) => r.map((x) => x[k]);
const maxOf = (a) => Math.max(...a);
const minOf = (a) => Math.min(...a);
const argmax = (a) => a.indexOf(maxOf(a));
const argmin = (a) => a.indexOf(minOf(a));
const corr = (a, b, lag) => {
  const n = Math.min(a.length, b.length) - Math.abs(lag);
  if (n <= 2) return 0;
  let sa = 0; let sb = 0; let saa = 0; let sbb = 0; let sab = 0;
  for (let i = 0; i < n; i += 1) {
    const ai = a[i + Math.max(0, -lag)];
    const bi = b[i + Math.max(0, lag)];
    sa += ai; sb += bi; saa += ai * ai; sbb += bi * bi; sab += ai * bi;
  }
  const cov = sab / n - (sa / n) * (sb / n);
  const va = saa / n - (sa / n) ** 2; const vb = sbb / n - (sb / n) ** 2;
  return va > 1e-12 && vb > 1e-12 ? cov / Math.sqrt(va * vb) : 0;
};
/* How many frames after `driver` the `follower` peaks: the ear follows the
   body, so only non-negative delays are allowed and a positive lag is the
   answer. r is the correlation at that lag. */
const bestLag = (driver, follower) => {
  let best = { lag: 0, r: -2 };
  for (let lag = 0; lag <= 40; lag += 1) {
    const n = Math.min(driver.length, follower.length - lag);
    if (n <= 4) break;
    let sa = 0; let sb = 0; let saa = 0; let sbb = 0; let sab = 0;
    for (let i = 0; i < n; i += 1) {
      const a = driver[i]; const b = follower[i + lag];
      sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
    }
    const cov = sab / n - (sa / n) * (sb / n);
    const va = saa / n - (sa / n) ** 2; const vb = sbb / n - (sb / n) ** 2;
    const r = va > 1e-12 && vb > 1e-12 ? cov / Math.sqrt(va * vb) : 0;
    if (r > best.r) best = { lag, r: +r.toFixed(3) };
  }
  return best;
};

const g = inPage.gestureRows;
const hop = inPage.hopRows;
const scaleY = rowsOf(g, 'scaleY');
const bob = rowsOf(g, 'bob');
const hopScale = rowsOf(hop, 'scaleY');
const hopBob = rowsOf(hop, 'bob');
const blink = inPage.blinkRows;
let blinks = 0;
for (let i = 1; i < blink.length; i += 1) if (blink[i] < 0.4 && blink[i - 1] >= 0.4) blinks += 1;
const yawSpans = inPage.yawTravel.map((y) => y.span);

const motion = {
  gesture: {
    scaleYMin: +minOf(scaleY).toFixed(4),
    squashAtMs: argmin(scaleY) * 16,
    scaleYMax: +maxOf(scaleY).toFixed(4),
    stretchAtMs: argmax(scaleY) * 16,
    apexBobAtMs: argmax(bob) * 16,
    squashBeforeApex: +(1 - minOf(scaleY.slice(0, argmax(bob)))).toFixed(4),
    stretchAtApex: +(maxOf(scaleY.slice(0, argmax(bob) + 6)) - 1).toFixed(4),
    landingSquash: +(1 - minOf(scaleY.slice(argmax(bob)))).toFixed(4),
    earVsBobLag: bestLag(bob, rowsOf(g, 'earLX')),
    earAmp: +(maxOf(rowsOf(g, 'earLX')) - minOf(rowsOf(g, 'earLX'))).toFixed(3),
    tailAmp: +(maxOf(rowsOf(g, 'tailX')) - minOf(rowsOf(g, 'tailX'))).toFixed(3),
    headAmp: +(maxOf(rowsOf(g, 'headX')) - minOf(rowsOf(g, 'headX'))).toFixed(3),
    settleEndScale: scaleY[scaleY.length - 1],
  },
  hop: {
    earVsBobLag: bestLag(hopBob, rowsOf(hop, 'earLX')),
    earAmp: +(maxOf(rowsOf(hop, 'earLX')) - minOf(rowsOf(hop, 'earLX'))).toFixed(3),
    squashFrames: hopScale.filter((v) => v < 0.985).length,
    settleAfterLanding: +(minOf(hopScale.slice(Math.floor(hopScale.length * 0.6))) - 1).toFixed(4),
    yawSpanMax: +maxOf(yawSpans).toFixed(3),
    yawSpanMin: +minOf(yawSpans).toFixed(3),
    yawPathMax: +maxOf(inPage.yawTravel.map((y) => y.path)).toFixed(3),
    yawSpins: inPage.yawTravel.filter((y) => y.path > 1).map((y) => y.hop),
  },
  blink: { eventsPer20s: blinks, minScale: +minOf(blink).toFixed(3) },
};

// face visibility
const faceRows = inPage.poseChecks.map((p) => ({ pose: p.pose, ...p.face }));
const val = (r, k) => r[k]?.normalDotView;
const faceSummary = {
  poses: faceRows.length,
  minPupilDot: +Math.min(...faceRows.flatMap((r) => [val(r, 'eyeNear'), val(r, 'eyeFar')]).filter(Number.isFinite)).toFixed(3),
  minNoseDot: +Math.min(...faceRows.map((r) => val(r, 'nose')).filter(Number.isFinite)).toFixed(3),
  occludedPoses: faceRows.filter((r) => !r.eyeNear.unoccluded || !r.eyeFar.unoccluded || !r.nose.unoccluded).map((r) => r.pose),
  outOfFrame: faceRows.filter((r) => !r.eyeNear.inFrame || !r.eyeFar.inFrame || !r.nose.inFrame).map((r) => r.pose),
  minMarginPx: +Math.min(...faceRows.flatMap((r) => [r.eyeNear, r.eyeFar, r.nose]).filter((e) => e.inFrame).map((e) => Math.min(e.px, 320 - e.px, e.py, 240 - e.py))).toFixed(1),
  farEyeDotRange: [
    +Math.min(...faceRows.map((r) => val(r, 'eyeFar'))).toFixed(3),
    +Math.max(...faceRows.map((r) => val(r, 'eyeFar'))).toFixed(3),
  ],
  worstPose: faceRows.slice().sort((a, b) => Math.min(val(a, 'eyeNear'), val(a, 'eyeFar')) - Math.min(val(b, 'eyeNear'), val(b, 'eyeFar')))[0].pose,
};

/* PNG writer */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePNG(path, rgb, w, h, scaleFactor = 1) {
  const W2 = w * scaleFactor; const H2 = h * scaleFactor;
  const raw = Buffer.alloc((W2 * 3 + 1) * H2);
  for (let y = 0; y < H2; y += 1) {
    raw[y * (W2 * 3 + 1)] = 0;
    for (let x = 0; x < W2; x += 1) {
      const si = (Math.floor(y / scaleFactor) * w + Math.floor(x / scaleFactor)) * 3;
      const di = y * (W2 * 3 + 1) + 1 + x * 3;
      raw[di] = rgb[si]; raw[di + 1] = rgb[si + 1]; raw[di + 2] = rgb[si + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W2, 0); ihdr.writeUInt32BE(H2, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}
const rgb = [];
for (let i = 0; i < W * H; i += 1) rgb.push(px.with[i * 4], px.with[i * 4 + 1], px.with[i * 4 + 2]);
writePNG(`${OUT}/${TAG}-canvas-320x240.png`, rgb, W, H, 1);
writePNG(`${OUT}/${TAG}-canvas-640x480.png`, rgb, W, H, 2);
{
  const sw = 32; const sh = s32.length;
  const out = Buffer.alloc(sw * sh * 3);
  for (let y = 0; y < sh; y += 1) for (let x = 0; x < sw; x += 1) {
    const v = s32[y][x];
    const o = (y * sw + x) * 3;
    const tone = Math.round(255 * v);
    out[o] = v >= 0.5 ? tone : 24; out[o + 1] = v >= 0.5 ? tone : 24; out[o + 2] = v >= 0.5 ? tone : 24;
  }
  writePNG(`${OUT}/${TAG}-silhouette-32w.png`, out, sw, sh, 8);
}

const result = {
  tag: TAG,
  url: URL_,
  stats: inPage.stats,
  clearance: inPage.clearance,
  parts: inPage.parts,
  forms: inPage.forms,
  allRoot: inPage.allRoot,
  silhouette: {
    coverage: +coverage.toFixed(4),
    bbox: { x0: bx0, x1: bx1, y0: by0, y1: by1, w: bx1 - bx0 + 1, h: by1 - by0 + 1 },
    cells32: 32 * s32.length,
    filled32: s32.flat().filter((v) => v >= 0.5).length,
    twoToneCells32: tones32.length,
  },
  value: {
    luminanceP10: +q(0.1).toFixed(1),
    p50: +q(0.5).toFixed(1),
    p90: +q(0.9).toFixed(1),
    p99: +q(0.99).toFixed(1),
    peaks: peaks.slice(0, 8),
    lightShareOver205: +(bearPixels.filter((p) => p.l >= 205).length / bearPixels.length).toFixed(4),
    lightShareOver220: +(bearPixels.filter((p) => p.l >= 220).length / bearPixels.length).toFixed(4),
    markShare: +markShare.toFixed(4),
    markRoleShare: +markRoleShare.toFixed(4),
    roleShare: Object.fromEntries(Object.entries(rolePixels).map(([k, v]) => [k, +(v / totalSample).toFixed(4)])),
    byPart: partLuma,
    byForm: formLuma,
    byColour: colourLuma,
  },
  density: {
    cells: edge,
    max: +maxOf(edge.flat()).toFixed(4),
    cornerMean: +((edge[0][0] + edge[0][9] + edge[7][0] + edge[7][9]) / 4).toFixed(4),
    empties: edge.flat().filter((v) => v === 0).length,
  },
  motion,
  series: {
    gesture: inPage.gestureRows.map((r) => [r.t, r.scaleY, r.bob, r.earLX, r.headX, r.eyesY]),
    hop: inPage.hopRows.map((r) => [r.t, r.scaleY, r.bob, r.earLX, r.rootY, r.yaw]),
    blink: inPage.blinkRows,
  },
  face: faceSummary,
  stillFace: inPage.stillFace,
  faceRows,
  yawTravel: inPage.yawTravel,
  errors,
};
writeFileSync(`${OUT}/${TAG}-measure.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify({
  tag: TAG, tris: inPage.stats.bearTriangles, calls: inPage.stats.calls,
  coverage: result.silhouette.coverage, bbox: result.silhouette.bbox,
  filled32: result.silhouette.filled32, twoTone32: result.silhouette.twoToneCells32,
  value: {
    p10: result.value.luminanceP10, p50: result.value.p50, p90: result.value.p90,
    peaks: result.value.peaks.slice(0, 5), light: result.value.lightShareOver205, mark: result.value.markShare,
    byPart: Object.fromEntries(Object.entries(partLuma).map(([k, v]) => [k, v.mean])),
  },
  clearance: result.clearance,
  motion, face: faceSummary, density: { max: result.density.max, corner: result.density.cornerMean, empties: result.density.empties },
  errors,
}, null, 1));
await browser.close();
