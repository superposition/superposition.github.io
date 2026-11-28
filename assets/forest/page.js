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

import * as gifts from './gifts.js';

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

const openButton = document.querySelector('[data-forest-open]');
const giftState = document.querySelector('[data-forest-gift-state]');
const specimen = document.querySelector('[data-forest-specimen]');
const specimenImage = document.querySelector('[data-forest-specimen-img]');
const specimenNote = document.querySelector('[data-forest-specimen-note]');

const lines = [...(list?.querySelectorAll('li') ?? [])].map((item) => {
  const anchor = item.querySelector('a');
  const sentence = item.querySelector('[data-sentence]');
  const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    name: (anchor?.textContent ?? '').trim(),
    href: anchor?.getAttribute('href') ?? '',
    sentence: /[.!?]$/.test(text) ? text : `${text}.`,
    slug: item.getAttribute('data-slug') ?? '',
    specimen: item.getAttribute('data-specimen') ?? '',
    species: item.getAttribute('data-species') ?? '',
    node: item,
  };
});

/* Which parcels this browser has already opened, by slug: a station index is
   the collection's order and the order can change, but a slug is the
   repository. Nothing here is required — a browser that refuses localStorage
   forgets between visits and loses nothing else. */
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const opened = gifts.load(storage);

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
  paintGift(index);
  writeSentence(entry.sentence, still);
}

/* The gift's own state, painted from the model rather than from the last click:
   which station the reader is at, which slug that station holds, and whether
   this browser has opened it. Everything that can change the answer calls this
   one function, so the button, the chip, the specimen and the list marker can
   never disagree. */
function paintGift(index) {
  const entry = lines[index];
  if (!entry) return;
  const isOpen = opened.has(entry.slug);

  if (openButton) {
    openButton.textContent = isOpen ? 'Parcel opened' : 'Open the parcel';
    openButton.setAttribute(
      'aria-label',
      isOpen
        ? `The parcel holding ${entry.name} is open`
        : `Open the parcel holding ${entry.name}`,
    );
    openButton.disabled = isOpen;
  }
  if (giftState) {
    giftState.textContent = isOpen ? 'The parcel is open' : 'The parcel is closed';
    giftState.dataset.open = isOpen ? 'true' : 'false';
  }
  if (specimen) specimen.hidden = !isOpen;
  if (isOpen && specimenImage && entry.specimen) {
    if (specimenImage.getAttribute('src') !== entry.specimen) {
      specimenImage.src = entry.specimen;
    }
    specimenImage.alt = `A ${entry.species} specimen: the plant this repository grows in the garden`;
  }
  if (specimenNote) {
    specimenNote.textContent = isOpen && entry.species
      ? `${entry.species} · the species its topic grows on the garden page`
      : '';
  }
  if (entry.node) entry.node.dataset.opened = isOpen ? 'true' : 'false';
}

/* Opening a parcel. The state machine lives in the model (gifts.js and
   parcels.js): this function records the slug, persists it, asks the scene to
   animate the parcel — or to simply be open under reduced motion, because a
   state is not a motion — and repaints. The scene's own phase is what the
   measurements read. */
function openGift(index) {
  const entry = lines[index];
  if (!forest || !entry || opened.has(entry.slug)) return;
  opened.add(entry.slug);
  gifts.save(storage, opened);
  if (reduced.matches) {
    // No loop is running, so the parcel is put open and the frame redrawn:
    // under reduced motion an open parcel is a state, not an animation.
    forest.openGiftNow(index);
    forest.still(index);
    forest.render();
  } else {
    forest.openGift(index);
  }
  paintGift(index);
  if (live) live.textContent = `${entry.name}: the parcel is open. ${entry.sentence}`;
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
  forest = createScene(canvas, readPalette(), lines.length);
  // A parcel that was opened on an earlier visit is open before the first
  // frame: the reader finds the wood as they left it, not a fresh one that
  // undoes what they did.
  lines.forEach((entry, index) => {
    if (opened.has(entry.slug)) forest.restoreGift(index);
  });
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
    /* The gift, through the same functions the controls call: the state
       machine, the set of slugs this browser remembers, and the placement, so
       a check can read what the page did rather than what it said. */
    open: (index) => openGift(index),
    gift: (index) => forest.parcelState(index),
    openGifts: () => [...opened].sort(),
    places: () => forest.places,
    parcelOf: (index) => forest.parcels[index],
    screen: () => forest.parcelScreen(),
    still: (index) => { forest.still(index); forest.render(); },
    pick: (x, y) => forest.pick(x, y),
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
    note.textContent = 'The bear needs WebGL, and this browser gave it none. The nineteen repositories are listed below, each with its sentence and its link.';
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

/* The gift is the affordance and the button is the way in without a pointer.
   Both call `openGift`, so the state machine has one entrance. */
if (openButton) openButton.addEventListener('click', () => openGift(current));

/* The parcel itself answers a click: the page hands in the ground-normalised
   point, the scene casts the ray through the camera the picture was drawn
   with, and only a closed parcel hit returns an index. A reader who clicks a
   parcel further up the path gets that station as well as the open, because
   the sentence is part of what the parcel is holding. */
const aim = (event) => {
  const rect = canvas?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
};

if (canvas) {
  canvas.addEventListener('click', (event) => {
    if (!forest) return;
    const point = aim(event);
    if (!point) return;
    const hit = forest.pick(point.x, point.y);
    if (hit === null) return;
    if (hit !== current) show(hit);
    openGift(hit);
  });

  /* A parcel that can be opened says so before it is clicked. The ray is cast
     per pointer move, which is a handful of box tests against at most a few
     parcels and no draw. */
  canvas.addEventListener('pointermove', (event) => {
    if (!forest || event.pointerType === 'touch') return;
    const point = aim(event);
    if (!point) return;
    const hit = forest.pick(point.x, point.y);
    canvas.style.cursor = hit === null ? '' : 'pointer';
  });
}
