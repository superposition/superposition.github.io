/* Runs axe-core against every story in the static build and exits non-zero on
   any violation.

   Run: npm run build-storybook && npm run a11y

   It reads storybook-static/index.json for the list of stories, serves the
   build on a local port, and visits each story's iframe URL in headless
   Chromium. Only the WCAG A and AA rule sets run: best-practice rules such as
   "region" and "landmark-one-main" describe a whole page, and a story is a
   fragment of one, so they would report the workbench's own harness rather
   than the component.

   The command is what CI gates on, so it is deliberately separate from the
   addon's panel: the panel shows a person what is wrong, this fails a build. */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { measureRun } from './axe.mjs';
import axe from 'axe-core';

const staticDir = resolve(fileURLToPath(new URL('../storybook-static', import.meta.url)));
const indexFile = join(staticDir, 'index.json');
if (!existsSync(indexFile)) {
  console.error('No storybook-static/index.json. Run `npm run build-storybook` first.');
  process.exit(1);
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(staticDir, path.endsWith('/') ? join(path, 'index.html') : path);
  if (!file.startsWith(staticDir) || !existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;

const stories = Object.values(JSON.parse(readFileSync(indexFile, 'utf8')).entries)
  .filter((entry) => entry.type === 'story');

const axeSource = readFileSync(fileURLToPath(import.meta.resolve('axe-core/axe.min.js')), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let failures = 0;
let checked = 0;
for (const story of stories) {
  await page.goto(`${origin}/iframe.html?id=${story.id}&viewMode=story`, { waitUntil: 'load' });
  try {
    await page.waitForSelector('#storybook-root > *', { timeout: 20000 });
  } catch {
    console.error(`  ! ${story.id}: nothing rendered`);
    failures += 1;
    continue;
  }
  await page.evaluate(() => document.fonts.ready);
  const results = await measureRun(page, { source: axeSource, tags: TAGS, id: story.id });

  checked += 1;
  if (!results.length) continue;
  failures += 1;
  console.error(`\n${story.title} — ${story.name}  (${story.id})`);
  for (const v of results) {
    console.error(`  ${v.impact ?? 'minor'}  ${v.id}: ${v.help} (${v.count})`);
    for (const node of v.nodes) console.error(`         ${node}`);
  }
}

await browser.close();
server.close();

if (failures) {
  console.error(`\n${failures} of ${checked} stories have accessibility violations.`);
  process.exit(1);
}
console.log(`axe: ${checked} stories, no violations.`);
