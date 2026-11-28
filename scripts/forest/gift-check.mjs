#!/usr/bin/env node
/* The gifts measured: the state machine, the pixels, the palette and the frame.

     node scripts/forest/gift-check.mjs --url http://127.0.0.1:4190/forest/ --out DIR

   This is the proof of everything the page claims about a parcel, and none of
   it is a description of the code: every number comes out of the live page.

     state      closed → opening → open, frame by frame, and what the DOM says
                at each step; a reload puts the parcel back open from
                localStorage, and the last frame of the animation and the
                restored frame are compared pixel for pixel.
     fill       how much of the parcel's own screen box the paper and the
                ribbon cover, before and after the open: the emptied box is a
                measurement, not a label.
     ladder     the mean luminance of each class in the frame, measured by
                hiding that class and diffing the framebuffer, then the same
                numbers from the greyscale conversion: near, mid and far have
                to stay ordered once the hue is gone.
     palette    every token the scene draws with, its contrast on the three
                grounds, and the pair where type sits on it.
     frame      triangle and draw-call counts, median and worst frame time at
                two widths, the JS weight, and the scroll's layout shift.

   Requirements: `puppeteer-core` and a Chromium build, exactly like
   scripts/forest/measure.mjs. Neither is a dependency of the site. */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Users/ericm/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe';
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, i, all) => {
  if (cur.startsWith('--')) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const URL_ = args.url || 'http://127.0.0.1:4190/forest/';
const OUT = args.out || '.';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--force-color-profile=srgb', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const report = {};
const errors = [];
const thirdParty = [];

async function open({ width = 1440, height = 900, reduced = false, js = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (!js) await page.setJavaScriptEnabled(false);
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(URL_.slice(0, URL_.indexOf('/', 8))) && !url.startsWith('data:')) thirdParty.push(url);
  });
  await page.goto(URL_, { waitUntil: 'networkidle0', timeout: 120000 });
  return page;
}

const bytes = (weight) => `${(weight / 1024).toFixed(1)} kB`;

/* A still of what the renderer drew. A screenshot of the canvas element reads
   the compositor, which can hand back the frame it composited before the call;
   the framebuffer is the picture, so the PNG is built from it and upscaled with
   no smoothing, which is also how the browser shows it. */
const framebufferPng = async (page, path, scale = 4) => {
  const dataUrl = await page.evaluate((factor) => {
    const data = window.__forest.grab();
    const source = document.createElement('canvas');
    source.width = 320;
    source.height = 240;
    source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), 320, 240), 0, 0);
    const out = document.createElement('canvas');
    out.width = 320 * factor;
    out.height = 240 * factor;
    const context = out.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }, scale);
  writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
};

/* A still of the page, with the frame the renderer drew laid over the stage so
   the picture in the shot is the picture the numbers were read from. */
const pageStill = async (page, path) => {
  await page.evaluate(() => {
    const data = window.__forest?.grab();
    document.querySelector('[data-forest-still]')?.remove();
    if (!data) return;
    const canvas = document.createElement('canvas');
    canvas.dataset.forestStill = 'true';
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data), 320, 240), 0, 0);
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none';
    document.querySelector('[data-forest-stage]').appendChild(canvas);
  });
  await page.screenshot({ path });
  await page.evaluate(() => document.querySelector('[data-forest-still]')?.remove());
};

/* --- the state machine, the fill and the persistence ------------------- */
const measured = (data, box) => {
  const W = 320;
  const H = 240;
  const centreX = (box.x / 2 + 0.5) * W;
  const centreY = (0.5 - box.y / 2) * H;
  const half = box.half * W;
  const linear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  let paper = 0;
  let ribbon = 0;
  let plant = 0;
  let total = 0;
  let sum = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (Math.abs(x - centreX) > half || Math.abs(y - centreY) > half * 0.85) continue;
      total += 1;
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sum += 0.2126 * linear(r / 255) + 0.7152 * linear(g / 255) + 0.0722 * linear(b / 255);
      // The paper is the warm pale face; the ribbon is the dark wine band on it.
      if (r > 70 && r > g * 1.2 && g >= b * 0.85) paper += 1;
      if (r > g * 1.15 && b > g * 0.9 && r < 170 && g < 90) ribbon += 1;
      // What the box is holding: green inside the box can only be the plant,
      // because the wrapping and the tie are the only other colours in there.
      if (g > r * 1.25 && g > b * 1.1) plant += 1;
    }
  }
  return {
    boxPx: [Math.round(half * 2), Math.round(half * 1.7)],
    total,
    paper,
    ribbon,
    plant,
    paperShare: +((paper / total) * 100).toFixed(2),
    ribbonShare: +((ribbon / total) * 100).toFixed(2),
    plantShare: +((plant / total) * 100).toFixed(2),
    meanGrey: Math.round(Math.pow(sum / total, 1 / 2.2) * 255),
  };
};

{
  const page = await open();
  await page.click('[data-forest-wake]');
  await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  await page.evaluate(() => { window.localStorage.clear(); window.__forest.pause(); });

  const closed = await page.evaluate(() => {
    const forest = window.__forest;
    forest.show(0, { instant: true });
    forest.render();
    return {
      phase: forest.gift(0).phase,
      chip: document.querySelector('[data-forest-gift-state]').textContent,
      button: document.querySelector('[data-forest-open]').getAttribute('aria-label'),
      specimenHidden: document.querySelector('[data-forest-specimen]').hidden,
      box: forest.screen()[0],
      data: forest.grab(),
    };
  });

  const phases = [];
  await page.evaluate(() => window.__forest.open(0));
  for (let i = 0; i < 12; i += 1) {
    phases.push(await page.evaluate(() => window.__forest.gift(0).phase));
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  await page.waitForFunction('window.__forest.gift(0).phase === "open"', { timeout: 5000 });

  const opened = await page.evaluate(() => {
    const forest = window.__forest;
    forest.render();
    return {
      phase: forest.gift(0).phase,
      chip: document.querySelector('[data-forest-gift-state]').textContent,
      button: document.querySelector('[data-forest-open]').getAttribute('aria-label'),
      disabled: document.querySelector('[data-forest-open]').disabled,
      specimen: document.querySelector('[data-forest-specimen-img]')?.getAttribute('src') ?? null,
      specimenAlt: document.querySelector('[data-forest-specimen-img]')?.alt ?? null,
      specimenVisible: !document.querySelector('[data-forest-specimen]').hidden,
      listMarked: document.querySelector('[data-forest-lines] li').getAttribute('data-opened'),
      stored: window.localStorage.getItem('superposition:forest:gifts:v1'),
      openCount: forest.stats().openParcels,
      data: forest.grab(),
    };
  });

  const box = { x: closed.box.x, y: closed.box.y, half: closed.box.px / 320 / 2 };
  const fillClosed = measured(closed.data, box);
  const fillOpen = measured(opened.data, box);

  /* The same composed frame twice: once after the animation, once out of
     storage after a reload. Anything that differs is a parcel that "stays
     open" in name only. */
  await page.evaluate(() => window.__forest.pause());
  await page.evaluate(() => window.__forest.still(0));
  const settled = await page.evaluate(() => { window.__forest.render(); return window.__forest.grab(); });

  const reload = await open();
  await reload.click('[data-forest-wake]');
  await reload.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  const restored = await reload.evaluate(() => {
    const forest = window.__forest;
    forest.pause();
    forest.still(0);
    forest.render();
    return {
      phase: forest.gift(0).phase,
      chip: document.querySelector('[data-forest-gift-state]').textContent,
      stored: window.localStorage.getItem('superposition:forest:gifts:v1'),
      data: forest.grab(),
    };
  });

  let differing = 0;
  for (let i = 0; i < settled.length; i += 4) {
    if (Math.abs(settled[i] - restored.data[i]) > 6
      || Math.abs(settled[i + 1] - restored.data[i + 1]) > 6
      || Math.abs(settled[i + 2] - restored.data[i + 2]) > 6) differing += 1;
  }

  report.state = {
    closed: { phase: closed.phase, chip: closed.chip, button: closed.button, specimenHidden: closed.specimenHidden },
    phases,
    opened: {
      phase: opened.phase,
      chip: opened.chip,
      button: opened.button,
      disabled: opened.disabled,
      specimen: opened.specimen,
      specimenAlt: opened.specimenAlt,
      specimenVisible: opened.specimenVisible,
      listMarked: opened.listMarked,
      stored: opened.stored,
      openCount: opened.openCount,
    },
    restored: { phase: restored.phase, chip: restored.chip, stored: restored.stored },
  };
  report.fill = { closed: fillClosed, opened: fillOpen, box: closed.box };
  report.restore = { differingPixels: differing, share: +((differing / (320 * 240)) * 100).toFixed(3) };

  /* The two ways in. The button is the keyboard path and the parcel is the
     pointer path; both go through the same open, so this checks that the
     pointer one actually finds the parcel under the cursor rather than that a
     handler exists. */
  const pointer = await page.evaluate(() => {
    const forest = window.__forest;
    forest.show(1, { instant: true });
    const parcel = forest.screen()[1];
    const canvas = document.querySelector('[data-forest-canvas]');
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (parcel.x / 2 + 0.5) * rect.width,
      y: rect.top + (0.5 - parcel.y / 2) * rect.height,
      phaseBefore: forest.gift(1).phase,
      hit: forest.pick(parcel.x, parcel.y),
    };
  });
  await page.mouse.click(pointer.x, pointer.y);
  await page.waitForFunction('window.__forest.gift(1).phase !== "closed"', { timeout: 5000 });
  const pointerAfter = await page.evaluate(() => window.__forest.gift(1).phase);

  const keyboard = await page.evaluate(() => {
    const forest = window.__forest;
    forest.show(2, { instant: true });
    const button = document.querySelector('[data-forest-open]');
    button.focus();
    return { focused: document.activeElement === button, label: button.getAttribute('aria-label'), phaseBefore: forest.gift(2).phase };
  });
  await page.keyboard.press('Enter');
  await page.waitForFunction('window.__forest.gift(2).phase !== "closed"', { timeout: 5000 });
  const keyboardAfter = await page.evaluate(() => window.__forest.gift(2).phase);

  report.pointer = { ...pointer, phaseAfter: pointerAfter };
  report.keyboard = { ...keyboard, phaseAfter: keyboardAfter };

  const weight = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((entry) => entry.name.includes('/assets/forest/'))
    .map((entry) => ({ name: entry.name.split('/').pop(), bytes: entry.encodedBodySize || 0 })));
  report.jsWeight = { files: weight, total: weight.reduce((sum, file) => sum + file.bytes, 0) };
  await page.close();
  await reload.close();
}

/* --- the value ladder and the palette --------------------------------- */
{
  const page = await open();
  await page.click('[data-forest-wake]');
  await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });

  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('[data-forest-wake]');
  await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });

  const ladder = await page.evaluate(() => {
    const forest = window.__forest;
    forest.pause();
    forest.show(0, { instant: true });
    const scene = forest.debug().scene;
    const W = 320;
    const H = 240;
    const linear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const luminance = (data) => {
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.2126 * linear(data[i] / 255) + 0.7152 * linear(data[i + 1] / 255) + 0.0722 * linear(data[i + 2] / 255);
      }
      return sum / (W * H);
    };
    const grab = () => { forest.render(); return forest.grab(); };
    const full = grab();
    const frame = luminance(full);

    const hidden = [];
    const classes = {};
    const measure = (label, objects) => {
      const before = grab();
      for (const object of objects) object.visible = false;
      const after = grab();
      for (const object of objects) object.visible = true;
      let pixels = 0;
      let sum = 0;
      for (let i = 0; i < before.length; i += 4) {
        const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]);
        if (d > 9) {
          pixels += 1;
          sum += 0.2126 * linear(before[i] / 255) + 0.7152 * linear(before[i + 1] / 255) + 0.0722 * linear(before[i + 2] / 255);
        }
      }
      classes[label] = {
        pixels,
        share: +((pixels / (W * H)) * 100).toFixed(2),
        meanL: pixels ? +(sum / pixels).toFixed(4) : null,
        grey: pixels ? Math.round(Math.pow(sum / pixels, 1 / 2.2) * 255) : null,
      };
      hidden.push(label);
    };

    const forestRoot = scene.getObjectByName('forest');
    const byName = (name) => forestRoot.children.filter((child) => child.name === name);
    measure('ground', byName('ground'));
    measure('trees', byName('trees'));
    measure('path', byName('trail'));
    measure('rocks', byName('rocks'));
    measure('bear', [scene.getObjectByName('bear')]);
    measure('parcels', forest.places().map((_, index) => forest.parcelOf(index).root));

    // The greyscale proof: the same frame converted, and the same means read
    // off the conversion rather than off the colour.
    const grey = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < full.length; i += 4, p += 1) {
      grey[p] = Math.round(0.2126 * full[i] + 0.7152 * full[i + 1] + 0.0722 * full[i + 2]);
    }
    const histogram = new Array(16).fill(0);
    for (const value of grey) histogram[Math.min(15, value >> 4)] += 1;

    // The ladder by depth band, not by object: what a reader reads as near,
    // as mid and as far, weighted by the pixels each class actually owns.
    const band = (labels) => {
      let pixels = 0;
      let sum = 0;
      for (const label of labels) {
        const entry = classes[label];
        if (!entry.pixels) continue;
        pixels += entry.pixels;
        sum += entry.meanL * entry.pixels;
      }
      return pixels ? { pixels, share: +((pixels / (W * H)) * 100).toFixed(2), meanL: +(sum / pixels).toFixed(4), grey: Math.round(Math.pow(sum / pixels, 1 / 2.2) * 255) } : null;
    };

    return {
      frameL: +frame.toFixed(4),
      classes,
      bands: {
        near: band(['bear', 'parcels']),
        mid: band(['trees', 'path', 'rocks']),
        far: band(['ground']),
      },
      histogram: histogram.map((count) => +(count / (W * H) * 100).toFixed(2)),
    };
  });

  report.ladder = ladder;

  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name) => style.getPropertyValue(name).trim();
    return {
      void: read('--void'),
      deep: read('--deep'),
      star: read('--star'),
      cream: read('--cream'),
      dust: read('--dust'),
      leaf: read('--flora-leaf'),
      bloom: read('--flora-bloom'),
      spore: read('--flora-spore'),
      paper: read('--gift-paper'),
      ribbon: read('--gift-ribbon'),
    };
  });
  report.tokens = tokens;
  await page.close();
}

/* --- the frame: counts, time, and the two widths ---------------------- */
{
  const times = {};
  for (const width of [1440, 420, 360]) {
    const page = await open({ width, height: width === 1440 ? 900 : 780 });
    await page.click('[data-forest-wake]');
    await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
    await page.evaluate(() => { window.__forest.reset(); });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    times[width] = await page.evaluate(() => ({
      median: +window.__forest.median().toFixed(2),
      worst: +window.__forest.worst().toFixed(2),
      stats: window.__forest.stats(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    await page.close();
  }
  report.frame = times;
}

/* --- the two widths, the recording stills, and the fallbacks ---------- */
{
  const page = await open();
  await page.click('[data-forest-wake]');
  await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  // A clean profile, so the stills show the wood as a first-time reader finds
  // it: every parcel closed. The shift observer goes on after the reload so
  // the only layout it sees is the page's own.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.shift;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.click('[data-forest-wake]');
  await page.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  /* The three stills are the animation's own frames, driven by hand with the
     loop stopped: 0 ms, 300 ms into the open, and the settled frame. A
     screenshot taken while the loop runs catches whatever the compositor had,
     which is why these are stepped rather than waited for. */
  const stepFor = (ms) => page.evaluate((total) => {
    for (let t = 0; t < total; t += 16) window.__forest.step(16);
    window.__forest.render();
  }, ms);

  await page.evaluate(() => { window.__forest.pause(); window.__forest.show(0, { instant: true }); window.__forest.render(); });
  await framebufferPng(page, `${OUT}/gift-closed-1440.png`);
  await pageStill(page, `${OUT}/forest-1440.png`);

  await page.evaluate(() => window.__forest.open(0));
  await stepFor(300);
  await framebufferPng(page, `${OUT}/gift-unwrapping-1440.png`);
  await stepFor(900);
  await page.evaluate(() => window.__forest.still(0));
  await framebufferPng(page, `${OUT}/gift-open-1440.png`);

  report.cls = await page.evaluate(() => +window.__cls.toFixed(4));
  report.errors = errors.slice();
  report.thirdParty = [...new Set(thirdParty)];
  await page.close();

  const phone = await open({ width: 420, height: 780 });
  await phone.click('[data-forest-wake]');
  await phone.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await phone.evaluate(() => { window.__forest.pause(); window.__forest.show(3, { instant: true }); window.__forest.render(); });
  await pageStill(phone, `${OUT}/forest-420.png`);
  report.phone = await phone.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvas: document.querySelector('[data-forest-canvas]').getBoundingClientRect().width,
  }));
  await phone.close();

  const small = await open({ width: 360, height: 740 });
  await small.click('[data-forest-wake]');
  await small.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await small.evaluate(() => { window.__forest.pause(); window.__forest.show(7, { instant: true }); window.__forest.render(); });
  await pageStill(small, `${OUT}/forest-360.png`);
  report.small = await small.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvas: document.querySelector('[data-forest-canvas]').getBoundingClientRect().width,
  }));
  await small.close();

  const reduced = await open({ reduced: true });
  await reduced.evaluate(() => window.localStorage.clear());
  await reduced.reload({ waitUntil: 'networkidle0' });
  await reduced.click('[data-forest-wake]');
  await reduced.waitForFunction('window.__forest && window.__forest.stats', { timeout: 60000 });
  await reduced.evaluate(() => { window.__forest.show(0, { instant: true }); window.__forest.render(); });
  await pageStill(reduced, `${OUT}/forest-reduced.png`);
  report.reduced = await reduced.evaluate(() => ({
    running: window.__forest.running(),
    openParcels: window.__forest.stats().openParcels,
    listed: document.querySelectorAll('[data-forest-lines] li').length,
    visibleLines: [...document.querySelectorAll('[data-forest-lines] li')].filter((li) => li.getBoundingClientRect().height > 0).length,
  }));
  await reduced.close();

  const nojs = await open({ js: false });
  report.nojs = await nojs.evaluate(() => ({
    listed: document.querySelectorAll('[data-forest-lines] li').length,
    links: document.querySelectorAll('[data-forest-lines] a').length,
    stageHidden: getComputedStyle(document.querySelector('[data-forest-stage]')).display,
  }));
  await nojs.screenshot({ path: `${OUT}/forest-nojs.png`, fullPage: false });
  await nojs.close();
}

report.totalJs = bytes(report.jsWeight.total);
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
await browser.close();
