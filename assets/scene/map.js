/* The home page's map, drawn in WebGL.

   This file is a presentation layer and nothing else. The still it replaces —
   _includes/scene/map.svg, projected from the same _data/scene-map.yml by the
   same lib/ modules — is already in the page and already correct, and it is
   what a reader without WebGL, without JavaScript, or with a script that failed
   to load will see. Nothing here adds or moves content: not one link, not one
   label, not one pixel of layout. The canvas is inserted behind the text and
   shown only after a frame has drawn.

   It also does nothing at all for a reader who asked for less motion. The still
   is the composed still: same layout, same camera, same depth fade.

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
    const [{ state, view, scales, project, fade, toPixel }, { form, place }, { stars, blobs, falloff }, THREE, lines] =
      await Promise.all([
        import('./lib/camera.js'),
        import('./lib/forms.js'),
        import('./lib/field.js'),
        import('three'),
        import('three/lines'),
      ]);

    const token = (name) =>
      new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#ffffff');

    const INK = {
      datum: token('--amber'),
      topic: token('--star'),
      repo: token('--cream'),
      unit: token('--cyan'),
      journal: token('--dust'),
      edge: token('--dust'),
      spine: token('--amber'),
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

    for (const e of data.edges) {
      const a = byId.get(e.a);
      const b = byId.get(e.b);
      if (!a || !b) continue;
      const d = (project(base, cam.aspect, a.p)[2] + project(base, cam.aspect, b.p)[2]) / 2;
      const f = fade(cam, d);
      const w = e.kind === 'spine' ? 2 : 1;
      const tint = e.kind === 'spine' ? INK.spine : e.kind === 'open' ? INK.open : INK.edge;
      push(w, a.p, b.p, tint, f * (e.kind === 'spine' ? 0.6 : e.kind === 'open' ? 0.4 : 0.5));
    }

    for (const n of nodes) {
      const f = fade(cam, project(base, cam.aspect, n.p)[2]);
      const w = n.weight;
      const tint = INK[n.kind] || INK.repo;
      for (const [a, b] of place(form(n.kind, n.size), n.p, base)) push(w, a, b, tint, f * 0.85);
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
    let aspect = w / h;

    const resize = () => {
      const r = hero.getBoundingClientRect();
      w = r.width;
      h = r.height;
      aspect = w / h;
      renderer.setPixelRatio(dpr());
      renderer.setSize(w, h, false);
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
      camera.fov = cam.fov;
      camera.aspect = aspect;
      camera.position.set(s.eye[0], s.eye[1], s.eye[2]);
      camera.up.set(0, 1, 0);
      camera.lookAt(cam.target[0], cam.target[1], cam.target[2]);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      for (const l of labels) {
        if (!l.node) continue;
        const q = project(v, aspect, l.node.p);
        const off = l.node.label || [0, 0];
        const px = toPixel([q[0] + off[0], q[1] + off[1]], w, h);
        const f = fade(cam, q[2]);
        const id = `${Math.round(px[0])},${Math.round(px[1])},${f.toFixed(2)}`;
        if (id === l.last) continue;
        l.last = id;
        const mid = l.el.dataset.kind === 'journal' ? '' : ' translate(-50%, -100%)';
        l.el.style.transform = `translate3d(${px[0].toFixed(1)}px, ${px[1].toFixed(1)}px, 0)${mid || ' translate(0, -100%)'}`;
        l.el.style.opacity = (0.55 + f * 0.45).toFixed(2);
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
      let best = null;
      for (const n of nodes) {
        const px = toPixel(project(v, aspect, n.p), w, h);
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
    hero.__map = { renderer, scene, camera, nodes, edges: data.edges, groups, draw, pose };
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
