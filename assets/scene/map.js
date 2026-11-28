/* The home page's map, drawn in WebGL.

   This file is a presentation layer and nothing else. The still it replaces —
   _includes/scene/map.svg, projected from the same _data/scene-map.yml by the
   same lib/ modules — is already in the page and already correct, and it is
   what a reader without WebGL, without JavaScript, or with a script that failed
   to load will see. Nothing here adds or moves content: not one link, not one
   label, not one pixel of layout. The canvas is inserted behind the text and
   shown only after a frame has drawn.

   It also does nothing at all for a reader who asked for less motion. The still
   is the composed still: same layout, same camera, same depth ramp.

   It draws the plate the still draws, from the same modules: the edges are cut
   where a nearer form hides them (`pieces()` in lib/camera.js), every stroke
   takes the value of the depth role it sits in (`valueAt()`), every form
   segment is lit or in shadow by the one azimuth in lib/forms.js, and the names
   hang from the same baseline rows. There is no second set of rules here.

   What moves, and why: the camera orbits the station by 4.5 degrees of yaw and
   1.5 of pitch on two slow sine periods, follows the pointer by a fraction of
   that, and pulls back 14 per cent as the hero leaves the top of the window.
   All four are bounded — the layout is checked against the extremes of that
   envelope at 1440 and at 420 by scripts/scene/map.mjs — so no record can drift
   out of the frame or into the band the type stands in. */

const hero = document.querySelector('[data-map]');

if (hero) {
  const canvas = hero.querySelector('.map-canvas');
  const still = hero.querySelector('.scene-still');
  const dataEl = hero.querySelector('.map-data');
  const hold = document.querySelector('.map-switch');

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  const webgl = () => {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  };

  const start = async () => {
    const data = JSON.parse(dataEl.textContent);
    const cam = data.camera;
    const [
      { ASPECT, state, view, project, depthAt, valueAt, pieces, unproject, toPixel },
      { form, place, hull, faceOf, normalOf, run, dash, RUNG },
      { stars, blobs, falloff },
      THREE,
      lines,
    ] = await Promise.all([
      import('./lib/camera.js'),
      import('./lib/forms.js'),
      import('./lib/field.js'),
      import('three'),
      import('three/lines'),
    ]);

    const token = (name) =>
      new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff');

    /* One hue per kind, and the accent only where something functional
       happens: amber on the station (the origin) and the state colour on the
       series units. The spines are structure, so they are drawn in the same
       ink as the rings they lead to -- the still does the same. */
    const INK = {
      datum: token('--amber'),
      topic: token('--star'),
      repo: token('--cream'),
      unit: token('--cyan'),
      journal: token('--dust'),
      edge: token('--dust'),
      spine: token('--star'),
      open: token('--dust'),
      star: token('--star'),
      cream: token('--cream'),
      dust: token('--dust'),
      amber: token('--amber'),
      cyan: token('--cyan'),
    };
    const base = view(state(cam, {}));
    const nodes = data.nodes;
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 200);

    /* One buffer per line weight. The weights are the site's own: 1, 2 and 4
       device pixels, read from the stylesheet so the canvas cannot drift from
       the type's rules. */
    const WEIGHTS = { 1: [], 2: [], 4: [] };
    const COLORS = { 1: [], 2: [], 4: [] };
    const push = (w, a, b, colour, alpha) => {
      WEIGHTS[w].push(a[0], a[1], a[2], b[0], b[1], b[2]);
      const k = Math.max(0, Math.min(1, alpha));
      COLORS[w].push(colour.r * k, colour.g * k, colour.b * k, colour.r * k, colour.g * k, colour.b * k);
    };

    /* What a form hides, at the composed pose: the same silhouettes and the
       same cuts the still is built from, from the same lib/ module. The clip is
       computed once, here, at the pose the plate is composed for -- a rebuild
       per frame would cost more than the four degrees of orbit can show. */
    const occluders = nodes
      .map((n) => {
        const q = project(base, cam.aspect, n.p);
        if (!q) return null;
        const poly = hull(n.kind, n.size)
          .map(([x, y]) => {
            const p = project(base, cam.aspect, place([[x, y, x, y]], n.p, base)[0][0]);
            return p ? [p[0], p[1]] : null;
          })
          .filter(Boolean);
        return poly.length >= 3 ? { poly, z: q[2], id: n.id } : null;
      })
      .filter(Boolean);

    const gap = (z) => {
      const role = depthAt(cam, z);
      return role === 'far' ? 6 / 910 : role === 'mid' ? 2.5 / 910 : 0;
    };

    const tally = { edges: 0, rungs: 0, forms: 0 };
    const drawEdge = (w, p, q, tint, opts) => {
      for (const span of pieces(cam, base, cam.aspect, p, q, occluders, opts)) {
        tally.edges++;
        const alpha = valueAt(cam, span.z);
        push(w, span.a, span.b, tint, alpha);
      }
    };

    /* `edges:` is a list of `[from, to, kind]` in the YAML, so it arrives here
       as a list of lists -- read it as one. It used to be read as an object,
       which quietly dropped every edge from the canvas: the plate drew its
       forms and no relations at all. */
    for (const [from, to, kind] of data.edges) {
      const a = byId.get(from);
      const b = byId.get(to);
      if (!a || !b) continue;
      const w = kind === 'spine' ? 2 : 1;
      const tint = kind === 'spine' ? INK.spine : kind === 'open' ? INK.open : INK.edge;
      const qa = project(base, cam.aspect, a.p);
      const qb = project(base, cam.aspect, b.p);
      if (!qa || !qb) continue;
      const trim = { head: gap(qa[2]), tail: gap(qb[2]), attached: [a.id, b.id] };
      const runs = kind === 'open' ? dash(a.p, b.p) : [[a.p, b.p]];
      for (const [p, q] of runs) drawEdge(w, p, q, tint, kind === 'open' ? { head: 0, tail: 0, attached: trim.attached } : trim);
      /* The spine's rungs: the pitch the still draws, in the same plane. */
      if (kind === 'spine') {
        for (const span of pieces(cam, base, cam.aspect, a.p, b.p, occluders, trim)) {
          for (const [r0, r1] of run(span.a, span.b, RUNG, base)) {
            const m = project(base, cam.aspect, [(r0[0] + r1[0]) / 2, (r0[1] + r1[1]) / 2, (r0[2] + r1[2]) / 2]);
            push(1, r0, r1, INK.edge, m ? valueAt(cam, m[2]) : 0.6);
            tally.rungs++;
          }
        }
      }
    }

    /* The arm off the frame: past the journal's bracket, through the right
       edge. The one line whose end is not a record. */
    const journalNode = byId.get('journal');
    if (journalNode) {
      const q = project(base, cam.aspect, journalNode.p);
      if (q) {
        const from = unproject(base, cam.aspect, [q[0] + 0.012, q[1]], q[2]);
        const to = unproject(base, cam.aspect, [1.04, q[1] - 0.004], q[2] * 1.022);
        for (const [p, q2] of dash(from, to)) drawEdge(1, p, q2, INK.open, { head: 0, tail: 0 });
      }
    }

    for (const n of nodes) {
      const q = project(base, cam.aspect, n.p);
      if (!q) continue;
      const w = n.weight;
      const tint = INK[n.kind] || INK.repo;
      const value = valueAt(cam, q[2]);
      for (const seg of place(form(n.kind, n.size), n.p, base)) {
        const [nx, ny] = normalOf(seg, n.p, base);
        push(w, seg[0], seg[1], tint, value * (faceOf(nx, ny) === 'lit' ? 1 : 0.52));
        tally.forms++;
      }
    }

    const groups = {};
    for (const w of [1, 2, 4]) {
      if (!WEIGHTS[w].length) continue;
      const geo = new lines.LineSegmentsGeometry();
      geo.setPositions(WEIGHTS[w]);
      geo.setColors(COLORS[w]);
      const mat = new lines.LineMaterial({
        linewidth: Number(w),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      mat.resolution.set(1, 1);
      const seg = new lines.LineSegments2(geo, mat);
      scene.add(seg);
      groups[w] = { seg, mat };
    }

    /* The sky. One draw call: three shells of seeded points, each with its own
       size and alpha, additive so overlapping light adds the way light does. */
    const sky = stars(data.seed, cam, cam.aspect);
    const skyPos = new Float32Array(sky.length * 3);
    const skySize = new Float32Array(sky.length);
    const skyAlpha = new Float32Array(sky.length);
    const skyTint = new Float32Array(sky.length * 3);
    sky.forEach((s, i) => {
      skyPos.set(s.p, i * 3);
      skySize[i] = s.size * dpr();
      skyAlpha[i] = s.alpha * 0.72;
      const c = INK[s.tint] || INK.star;
      skyTint.set([c.r, c.g, c.b], i * 3);
    });
    const skyGeo = new THREE.BufferGeometry();
    skyGeo.setAttribute('position', new THREE.BufferAttribute(skyPos, 3));
    skyGeo.setAttribute('aSize', new THREE.BufferAttribute(skySize, 1));
    skyGeo.setAttribute('aAlpha', new THREE.BufferAttribute(skyAlpha, 1));
    skyGeo.setAttribute('aTint', new THREE.BufferAttribute(skyTint, 3));
    const skyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aTint;
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          vAlpha = aAlpha;
          vTint = aTint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize;
        }`,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vTint;
        void main() {
          gl_FragColor = vec4(vTint, vAlpha);
        }`,
    });
    scene.add(new THREE.Points(skyGeo, skyMat));

    /* The haze: eleven quads facing the composed camera, each with the same
       falloff the still draws, added together. No texture, no gradient, no
       video — the shape is the sum of the discs. */
    const haze = blobs();
    const hazePos = [];
    const hazeUv = [];
    const hazeTint = [];
    const hazeAlpha = [];
    for (const b of haze) {
      const c = INK[b.tint] || INK.dust;
      const x = base.x;
      const y = base.y;
      const r = b.r;
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ];
      for (const [u, v] of corners) {
        hazePos.push(
          b.p[0] + x[0] * u * r + y[0] * v * r,
          b.p[1] + x[1] * u * r + y[1] * v * r,
          b.p[2] + x[2] * u * r + y[2] * v * r,
        );
        hazeUv.push(u, v);
        hazeTint.push(c.r, c.g, c.b);
        hazeAlpha.push(b.alpha);
      }
    }
    const hazeGeo = new THREE.BufferGeometry();
    hazeGeo.setAttribute('position', new THREE.Float32BufferAttribute(hazePos, 3));
    hazeGeo.setAttribute('aUv', new THREE.Float32BufferAttribute(hazeUv, 2));
    hazeGeo.setAttribute('aTint', new THREE.Float32BufferAttribute(hazeTint, 3));
    hazeGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(hazeAlpha, 1));
    const hazeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec2 aUv;
        attribute vec3 aTint;
        attribute float aAlpha;
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vAlpha;
        void main() {
          vUv = aUv;
          vTint = aTint;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vTint;
        varying float vAlpha;
        void main() {
          float d = length(vUv) * 0.5;
          float f = pow(max(0.0, 1.0 - d * d), 2.0);
          gl_FragColor = vec4(vTint, vAlpha * f);
        }`,
    });
    scene.add(new THREE.Mesh(hazeGeo, hazeMat));

    /* The labels the still draws are drawn here as text in the page, at the
       same anchors, so the map keeps its names when it is live. */
    const labels = [...hero.querySelectorAll('.map-label')].map((el) => ({
      el,
      node: byId.get(el.dataset.node),
      last: '',
    }));

    const box = hero.getBoundingClientRect();
    let w = box.width;
    let h = box.height;

    /* The plate is composed in a 1.82 : 1 box and the still letterboxes it
       into the frame with `preserveAspectRatio="xMidYMid meet"`. The canvas has
       to do the same thing, or the plate would grow and rise the moment it
       takes over: same aspect, same drawn rectangle, same offset. `plate()` is
       that rectangle, and everything that turns a normalised position into a
       pixel goes through it -- the viewport, the scissor, the labels. */
    const plate = () => {
      const fw = Math.min(w, h * ASPECT);
      const fh = fw / ASPECT;
      return { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh };
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      w = r.width;
      h = r.height;
      renderer.setPixelRatio(dpr());
      renderer.setSize(w, h, false);
      renderer.setScissorTest(true);
      for (const k in groups) groups[k].mat.resolution.set(w, h);
    };
    resize();

    /* One pose for a moment in time, a pointer position and a scroll offset.
       Everything is bounded; nothing here can take a record out of the frame. */
    const pose = (t, pointer, scroll) => ({
      yaw: cam.yaw * Math.sin(t / 37) + pointer.x * 0.9,
      pitch: cam.pitch * Math.sin(t / 53) + pointer.y * 0.55,
      dolly: cam.dolly[0] + (cam.dolly[1] - cam.dolly[0]) * scroll,
    });

    const draw = (t, pointer, scroll) => {
      const p = pose(t, pointer, scroll);
      const s = state(cam, p);
      const v = view(s);
      const f = plate();
      camera.fov = cam.fov;
      camera.aspect = ASPECT;
      camera.position.set(s.eye[0], s.eye[1], s.eye[2]);
      camera.up.set(0, 1, 0);
      camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
      camera.updateProjectionMatrix();
      /* GL's origin is the foot of the canvas; the frame's is its head. */
      const gy = h - f.y - f.h;
      renderer.setViewport(f.x, gy, f.w, f.h);
      renderer.setScissor(f.x, gy, f.w, f.h);
      renderer.render(scene, camera);

      for (const l of labels) {
        if (!l.node) continue;
        const q = project(v, ASPECT, l.node.p);
        const off = l.node.label || [0, 0];
        /* The anchor is the name's baseline on the shared row grid: the offset
           in the data is already snapped to it, so the canvas and the still put
           every name on the same row. The element hangs by its own baseline --
           a hair above the bottom of its box, which is where the fall is. */
        const f = plate();
        const px = [f.x + (q[0] + off[0] + 1) * 0.5 * f.w, f.y + (1 - (q[1] + off[1])) * 0.5 * f.h];
        const value = valueAt(cam, q[2]);
        const id = `${Math.round(px[0])},${Math.round(px[1])},${value.toFixed(2)}`;
        if (id === l.last) continue;
        l.last = id;
        const align = l.el.dataset.kind === 'journal' ? '0' : '-50%';
        l.el.style.transform = `translate3d(${px[0].toFixed(1)}px, ${px[1].toFixed(1)}px, 0) translate(${align}, calc(-100% + 0.21em))`;
        l.el.style.opacity = value.toFixed(2);
      }
    };

    /* The pointer is read once per frame from the last event, and damped, so a
       fast hand does not make the plate twitch. The same event picks the record
       under it: hovering a form names it, and clicking it goes there. */
    const pointer = { x: 0, y: 0 };
    const aim = { x: 0, y: 0 };
    const name = hero.querySelector('.map-name');
    let t0 = 0;
    const clock = () => (performance.now() - t0) / 1000;

    const scrollOut = () => {
      const r = hero.getBoundingClientRect();
      const travel = Math.max(1, r.height * 0.7);
      return Math.max(0, Math.min(1, -r.top / travel));
    };


    const hit = (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const v = view(state(cam, pose(clock(), aim, scrollOut())));
      const f = plate();
      let best = null;
      for (const n of nodes) {
        const ndc = project(v, ASPECT, n.p);
        const px = [f.x + (ndc[0] + 1) * 0.5 * f.w, f.y + (1 - ndc[1]) * 0.5 * f.h];
        const d = Math.hypot(px[0] - x, px[1] - y);
        if (d < 20 && (!best || d < best.d)) best = { n, d };
      }
      return best ? best.n : null;
    };
    const label = (n) =>
      !n ? '' : n.id === 'journal' ? `${n.name} · ${n.count} ${n.count === 1 ? 'entry' : 'entries'}` : n.name;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const n = hit(e);
      hero.style.cursor = n ? 'pointer' : '';
      if (name) name.textContent = label(n);
    });
    hero.addEventListener('pointerleave', () => {
      pointer.x = 0;
      pointer.y = 0;
      hero.style.cursor = '';
      if (name) name.textContent = '';
    });
    hero.addEventListener('click', (e) => {
      const n = hit(e);
      if (n) window.location.href = n.url;
    });

    draw(0, { x: 0, y: 0 }, 0);
    hero.dataset.map = 'live';

    let raf = 0;
    let running = false;
    let visible = true;

    const frame = (now) => {
      if (!t0) t0 = now;
      const t = (now - t0) / 1000;
      aim.x += (pointer.x - aim.x) * 0.05;
      aim.y += (pointer.y - aim.y) * 0.05;
      draw(t, aim, scrollOut());
      raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (running || !visible || document.hidden || (hold && hold.checked)) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (hold && hold.checked ? pause() : play());

    if (hold) hold.addEventListener('change', sync);
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : sync()));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          if (visible) sync();
          else pause();
        },
        { threshold: 0 },
      ).observe(hero);
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        draw(clock(), aim, scrollOut());
      }, 120);
    });

    play();

    /* The head of the console: what the frame cost, when somebody asks. */
    hero.__map = { renderer, scene, camera, nodes, edges: data.edges, groups, draw, pose, tally };
  };

  const go = () => start().catch(() => {
    /* A failed import or a lost context leaves the still exactly as it is. */
    delete hero.dataset.map;
  });

  if (!webgl() || calm.matches) {
    /* Nothing to do: the still is the scene. */
  } else if (document.readyState === 'complete') {
    go();
  } else {
    window.addEventListener('load', go, { once: true });
  }
}
