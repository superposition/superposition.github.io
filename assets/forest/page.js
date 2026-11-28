/* The page: the poster, the button that wakes it, the sentence panel, and the
   frame loop. Nothing here draws; scene.js draws.

   Three things this file is careful about:

   The twenty sentences are not in this file. They are in the HTML, rendered by
   Liquid from `_repos/*.md`, one `<li>` per repository with its link. This file
   reads them out of that list and shows one at a time, so the page holds
   exactly one copy of each sentence, the no-JavaScript page is that same text,
   and a sentence can never drift from the page it belongs to.

   Nothing loads until the reader asks. `scene.js` and its copy of three are a
   dynamic import inside the wake handler, so the poster weighs what a poster
   weighs and a reader who never presses it never pays for a renderer.

   Under `prefers-reduced-motion: reduce` the scene still exists — it is a
   picture of the forest — but there is no hop, no camera move and no typing:
   the bear is posed in the middle of the station's gesture, and every sentence
   arrives at once. */

const TYPE_MS = 50;

const root = document.querySelector('[data-forest-stage]');
const poster = document.querySelector('[data-forest-poster]');
const wake = document.querySelector('[data-forest-wake]');
const canvas = document.querySelector('[data-forest-canvas]');
const panel = document.querySelector('[data-forest-panel]');
const counter = document.querySelector('[data-forest-count]');
const line = document.querySelector('[data-forest-sentence]');
const live = document.querySelector('[data-forest-live]');
const link = document.querySelector('[data-forest-link]');
const next = document.querySelector('[data-forest-next]');
const previous = document.querySelector('[data-forest-prev]');
const list = document.querySelector('[data-forest-lines]');

const lines = [...(list?.querySelectorAll('li') ?? [])].map((item) => {
  const anchor = item.querySelector('a');
  const sentence = item.querySelector('[data-sentence]');
  const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    name: (anchor?.textContent ?? '').trim(),
    href: anchor?.getAttribute('href') ?? '',
    sentence: /[.!?]$/.test(text) ? text : `${text}.`,
  };
});

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const pad = (n) => String(n).padStart(2, '0');

let forest = null;
let record = null;
let current = -1;
let typing = 0;

function stopTyping() {
  if (typing) window.clearTimeout(typing);
  typing = 0;
  forest?.setTyping(false);
}

function writeSentence(text, instant) {
  stopTyping();
  if (live) live.textContent = text;
  if (!line) return;
  if (instant || reduced.matches) {
    line.textContent = text;
    return;
  }
  line.textContent = '';
  forest?.setTyping(true);
  let at = 0;
  const tick = () => {
    at += 1;
    line.textContent = text.slice(0, at);
    if (at < text.length) typing = window.setTimeout(tick, TYPE_MS);
    else stopTyping();
  };
  typing = window.setTimeout(tick, TYPE_MS);
}

function show(index, { instant = false } = {}) {
  if (!forest || index < 0 || index >= lines.length) return;
  const entry = lines[index];
  current = index;
  const still = instant || reduced.matches;
  forest.go(index, { instant: still });
  if (reduced.matches) {
    // No loop runs under reduced motion, so a station change is one composed
    // frame rather than an animation: pose the bear, then draw it once.
    forest.still(index);
    forest.render();
  }

  if (counter) counter.textContent = `${pad(index + 1)} / ${pad(lines.length)}`;
  if (link) {
    link.href = entry.href;
    link.textContent = entry.name;
    link.setAttribute('aria-label', `${entry.name}: the repository page`);
  }
  if (previous) previous.disabled = index === 0;
  if (next) next.disabled = index === lines.length - 1;
  writeSentence(entry.sentence, still);
}

function loop(now) {
  const dt = record.last ? Math.min(64, now - record.last) : 16;
  record.last = now;
  record.samples.push(dt);
  if (record.samples.length > 240) record.samples.shift();
  forest.step(dt);
  forest.render();
  record.raf = window.requestAnimationFrame(loop);
}

function unpause() {
  if (!forest || reduced.matches || record.raf) return;
  record.last = 0;
  record.raf = window.requestAnimationFrame(loop);
}

function pause() {
  if (!record?.raf) return;
  window.cancelAnimationFrame(record.raf);
  record.raf = 0;
}

async function load() {
  const { readPalette } = await import('./tokens.js');
  const { createScene } = await import('./scene.js');
  forest = createScene(canvas, readPalette());
  record = { last: 0, samples: [], raf: 0 };

  poster?.remove();
  panel?.removeAttribute('hidden');

  show(0, { instant: true });
  if (!reduced.matches) unpause();

  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      pause();
      show(current, { instant: true });
    } else {
      show(current, { instant: true });
      unpause();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) unpause();
    else pause();
  }, { threshold: 0 });
  if (root) observer.observe(root);

  window.__forest = {
    stats: () => forest.stats(),
    show,
    next: () => show(current + 1),
    previous: () => show(current - 1),
    median: () => {
      const sorted = [...record.samples].sort((a, b) => a - b);
      return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    },
    worst: () => record.samples.reduce((a, b) => Math.max(a, b), 0),
    reset: () => { record.samples.length = 0; },
    sentences: lines,
    running: () => Boolean(record.raf),
    /* Everything below is the page's own instrument, kept because every number
       in the pull request was read through it and a reader should be able to
       re-read them in a console: the framebuffer's exact pixels (`grab` returns
       the drawing buffer, flipped to top-down), the objects behind them so a
       check can project a point on the bear and read the pixel it lands on, and
       the clock. Removal is two keystrokes; reproducing the measurements
       without it is not. */
    grab: () => {
      forest.render();
      const gl = forest.renderer.getContext();
      const buffer = new Uint8Array(320 * 240 * 4);
      gl.readPixels(0, 0, 320, 240, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
      const flipped = new Uint8Array(buffer.length);
      const row = 320 * 4;
      for (let y = 0; y < 240; y += 1) {
        flipped.set(buffer.subarray((239 - y) * row, (240 - y) * row), y * row);
      }
      return Array.from(flipped);
    },
    render: () => forest.render(),
    step: (dt) => forest.step(dt),
    pause,
    resume: unpause,
    debug: () => ({ camera: forest.camera, bear: forest.bear, scene: forest.scene, stage: root }),
  };
}

wake?.addEventListener('click', async () => {
  wake.disabled = true;
  wake.textContent = 'Waking the bear';
  try {
    await load();
  } catch (error) {
    wake.remove();
    const note = document.createElement('p');
    note.className = 'forest-fallback';
    note.textContent = 'The bear needs WebGL, and this browser gave it none. The twenty repositories are listed below, each with its sentence and its link.';
    poster?.appendChild(note);
    console.error(error);
  }
});

/* The poster's button is the one control this file answers, so it is hidden in
   the markup and revealed here: a reader whose module never arrives keeps the
   poster and the twenty sentences and is never offered a button that does
   nothing. */
if (wake) wake.hidden = false;

if (next) next.addEventListener('click', () => show(current + 1));
if (previous) previous.addEventListener('click', () => show(current - 1));
