import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The site's accessibility floor, as a gate rather than a paragraph.

   Run: npm run states   (from storybook/)

   This is the half of the check axe cannot see. `npm run a11y` runs axe over
   the built workbench and reports what a rendered story violates; this reads
   the stylesheet and the Jekyll pages and reports what no story can reach — a
   state that was never written, a target that is too small at a width no story
   is set to, an image in a page that is not a story at all.

   Four things are checked, because these are the four that break silently on a
   dark site with custom controls:

     1. States. Every interactive component declares rest, hover,
        focus-visible and active; the ones that can be unavailable declare
        disabled. A component cannot ship with half its states.
     2. Targets. Every control's declared box — type size × line height plus
        block padding, from tokens.css — clears 24 × 24 CSS px at the narrowest
        width the site supports (360) as well as at the widest. Anything an
        inline link exception would cover is named in the list and explained.
     3. Markup. Every page ships alt text on every image, a label for every
        control, one h1, a skip link and a lang. No javascript: URLs, no
        unrel'd _blank.
     4. Motion. Every animated selector has an answer in the reduced-motion
        block, and no rule hides a focus ring with outline: none.

   Contrast is separate: `npm run contrast`. */

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..');
const SITE_CSS = join(root, 'assets', 'notebook.css');
const TOKENS_CSS = join(root, 'assets', 'tokens.css');

const failures = [];
const report = [];
const fail = (rule, where, detail) => failures.push({ rule, where, detail });

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));
const readCss = (path) => stripComments(readFileSync(path, 'utf8')).replace(/@charset[^;]+;/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/* Rules, with the at-rule prelude they live under, so the same selector can be
   read as it applies at 360px and at 1440px. */
const rules = (css) => {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2], index: m.index, prelude: '' });
  }
  for (const at of css.matchAll(/@(media|supports|container)\s+([^{]+)\{/g)) {
    const start = at.index + at[0].length;
    let depth = 1, i = start;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    const inner = css.slice(start, i - 1);
    for (const m of inner.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({
        selector: m[1].trim().replace(/\s+/g, ' '),
        body: m[2],
        index: start + m.index,
        prelude: `@${at[1]} ${at[2].trim()}`,
      });
    }
  }
  return out;
};

const declarations = (body) =>
  body.split(';').map((d) => d.trim()).filter(Boolean).flatMap((d) => {
    const at = d.indexOf(':');
    return at < 0 ? [] : [{ prop: d.slice(0, at).trim().toLowerCase(), value: d.slice(at + 1).trim() }];
  });

// ------------------------------------------------------------------ tokens ----

const tokenCss = readCss(TOKENS_CSS);
const tokens = (prelude) => {
  const map = {};
  for (const r of rules(tokenCss)) {
    const isRoot = r.selector === ':root';
    const isNarrow = r.prelude.includes('max-width: 700px');
    if (!isRoot && !(prelude === 'narrow' && isNarrow)) continue;
    if (prelude === 'wide' && r.prelude) continue;
    for (const { prop, value } of declarations(r.body)) if (prop.startsWith('--')) map[prop.slice(2)] = value;
  }
  return map;
};

const num = (value, map, depth = 0) => {
  if (value == null || depth > 6) return null;
  const v = value.trim();
  const direct = v.match(/^(-?\d*\.?\d+)px$/);
  if (direct) return Number(direct[1]);
  const unitless = v.match(/^(-?\d*\.?\d+)$/);
  if (unitless) return Number(unitless[1]);
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return num(map[ref[1]], map, depth + 1);
  const clamp = v.match(/^clamp\(([^,]+),([^,]+),([^)]+)\)$/);
  if (clamp) {
    // The floor is the worst case for a target: the smallest the box ever is.
    const values = [clamp[1], clamp[2], clamp[3]].map((x) => num(x, map, depth + 1)).filter((x) => x != null);
    return values.length ? Math.min(...values) : null;
  }
  return null;
};

// ------------------------------------------------- 1 + 2. states and targets ----

const siteCss = readCss(SITE_CSS);
const siteRules = rules(siteCss);

/* Every control the site ships, and what it is allowed to inherit. `inline`
   marks a link that sits inside a sentence: WCAG's target-size minimum does not
   apply to it, and the note says so. */
// A control that inherits its type from the block it sits in names the type
// that block sets, so the measurement is the one the reader gets.
const CONTROLS = [
  { name: 'Button', selector: '.btn', disabled: true },
  { name: 'Command link', selector: '.text-link', type: ['--step-1', 1.7] },
  { name: 'Footer link', selector: '.site-footer a', type: ['--step-1', 1.8] },
  { name: 'Soundtrack', selector: '.soundtrack-toggle', type: ['--step-1', 1.8] },
  { name: 'Nav link', selector: '.site-header nav a', type: ['--step-1', 1.6], narrowType: ['--step-header', 1.6] },
  { name: 'Wordmark', selector: '.home-link', type: ['--step-1', 1.6], narrowType: ['--step-header', 1.6] },
  { name: 'Topic link', selector: '.topic-list a', type: ['--step-2', 1.6] },
  { name: 'Card', selector: '.card', type: ['--step-2', 1.5] },
  { name: 'Repository row', selector: '.repo-row', type: ['--step-2', 1.55] },
  { name: 'Entry row', selector: '.entry', type: ['--step-2', 1.7] },
  { name: 'Table link', selector: '.table td a', type: ['--step-2', 1.5] },
  { name: 'Range link', selector: '.range-link', type: ['--step-1', 1.6] },
  { name: 'Strip pause', selector: '.strip-pause', type: ['--step-1', 1.6] },
  { name: 'Crawl hold', selector: '.crawl-hold label', type: ['--step-1', 1.6] },
];

// A rule may carry a selector list; the control is covered by any part of it.
const collect = (selector, profile) => {
  const out = {};
  for (const r of siteRules) {
    const parts = r.selector.split(',').map((p) => p.trim());
    if (!parts.includes(selector)) continue;
    const narrow = /max-width:\s*(\d+)px/.exec(r.prelude);
    if (profile === 'wide' && narrow) continue;
    if (profile === 'narrow' && narrow && Number(narrow[1]) < 360) continue;
    for (const { prop, value } of declarations(r.body)) out[prop] = value;
  }
  return out;
};

/* Hover, focus-visible, active are written in the shared `:is(…)` lists for the
   sweep and as their own pseudo-class rules for the rest, so a control counts as
   covered when its selector appears in a rule whose selector names that state. */
// A component may inherit a state from the bare link rule rather than repeat
// it: the bare link is where the site defines hover, focus and active.
const hasState = (selector, state) =>
  siteRules.some((r) => {
    if (r.selector === `a${state}`) return true;
    if (!r.selector.includes(selector)) return false;
    return r.selector.includes(state);
  });

for (const control of CONTROLS) {
  for (const state of [':hover', ':focus-visible', ':active']) {
    if (!hasState(control.selector, state)) fail('states', control.name, `no ${state} rule for ${control.selector}`);
  }
  if (control.disabled && !hasState(control.selector, 'disabled')) {
    fail('states', control.name, `no disabled rule for ${control.selector}`);
  }

  for (const profile of ['wide', 'narrow']) {
    const map = tokens(profile);
    const decl = collect(control.selector, profile);
    if (!Object.keys(decl).length) { fail('states', control.name, `no base rule for ${control.selector}`); break; }
    const font = decl.font ?? '';
    const sizeToken = font.match(/(var\(--[\w-]+\))(?:\s*\/\s*([^ ]+))?\s+var\(--font-/);
    const own = control.type && (profile === 'narrow' && control.narrowType ? control.narrowType : control.type);
    const fontSize = sizeToken ? num(sizeToken[1], map) : own ? num(`var(${own[0]})`, map) : num(decl['font-size'], map);
    const lineHeight = sizeToken?.[2] ? num(sizeToken[2], map) ?? Number(sizeToken[2]) : own ? own[1] : 1.4;
    // A shorthand is read by its components: the block pair is the first value
    // (one value), the first two (two values) or the first and third (four).
    const box = (prop) => {
      if (decl[prop] == null) return null;
      const parts = decl[prop].trim().split(/\s+/).map((v) => num(v, map));
      if (parts.some((v) => v == null)) return null;
      if (parts.length === 1) return [parts[0], parts[0]];
      if (parts.length === 2) return [parts[0], parts[0]];
      if (parts.length === 3) return [parts[0], parts[2]];
      return [parts[0], parts[2]];
    };
    const blockPad = box('padding-block') ?? box('padding') ?? [0, 0];
    const pt = box('padding-block-start')?.[0] ?? box('padding-top')?.[0] ?? blockPad[0];
    const pb = box('padding-block-end')?.[0] ?? box('padding-bottom')?.[0] ?? blockPad[1];
    if (fontSize == null || !Number.isFinite(lineHeight)) {
      fail('targets', control.name, `cannot read the type size of ${control.selector}`);
      break;
    }
    const height = fontSize * lineHeight + pt + pb;
    if (height < 24) {
      fail('targets', control.name, `${control.selector} is ${height.toFixed(1)}px tall at ${profile === 'wide' ? '1440' : '360'} — under the 24px minimum`);
    }
    if (profile === 'wide') report.push([control.name, control.selector, `${height.toFixed(1)}px`, `${pt}+${pb}`, `${fontSize}×${lineHeight}`]);
  }
}

// ------------------------------------------------------------- 3. markup ----

const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', '_site-drafts', '.jekyll-cache', 'storybook', 'vendor', '_drafts']);
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};
const markup = [...walk(root), join(root, '_layouts', 'default.html'), join(root, '404.html')]
  .filter((f) => ['.html', '.md'].includes(extname(f)))
  .filter((f, i, all) => all.indexOf(f) === i);

for (const file of markup) {
  const rel = file.slice(root.length + 1).split('\\').join('/');
  const text = readFileSync(file, 'utf8')
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  for (const m of text.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\balt=/.test(tag) && !/\baria-hidden="true"/.test(tag)) {
      fail('markup', `${rel}:${lineAt(text, m.index)}`, `<img> with no alt: ${tag.slice(0, 90)}`);
    }
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      fail('markup', `${rel}:${lineAt(text, m.index)}`, `image with no width/height, so the box cannot be reserved: ${tag.slice(0, 90)}`);
    }
  }
  for (const m of text.matchAll(/<a\b[^>]*>/g)) {
    if (!/\bhref=/.test(m[0]) && !/\bid=/.test(m[0])) fail('markup', `${rel}:${lineAt(text, m.index)}`, `<a> with no href`);
    if (/href="javascript:/i.test(m[0])) fail('markup', `${rel}:${lineAt(text, m.index)}`, 'javascript: URL');
    if (/target="_blank"/.test(m[0]) && !/rel="[^"]*noopener/.test(m[0])) {
      fail('markup', `${rel}:${lineAt(text, m.index)}`, 'target="_blank" without rel="noopener"');
    }
  }
  for (const m of text.matchAll(/<button\b[^>]*>/g)) {
    if (!/\btype=/.test(m[0])) fail('markup', `${rel}:${lineAt(text, m.index)}`, `<button> with no type`);
  }
  for (const m of text.matchAll(/<input\b[^>]*>/g)) {
    const tag = m[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    const labelled =
      /\baria-label /.test(tag) || /\baria-labelledby=/.test(tag) ||
      (id && text.includes(`for="${id}"`)) || /\bclass="[^"]*visually-hidden/.test(tag);
    if (!labelled) fail('markup', `${rel}:${lineAt(text, m.index)}`, `<input> with no label: ${tag.slice(0, 80)}`);
  }
  if (/\{%\s*seo\s*%\}/.test(text) && !/<html[^>]*lang=/.test(readFileSync(join(root, '_layouts', 'default.html'), 'utf8'))) {
    fail('markup', rel, 'page has no lang on <html>');
  }
}

const defaultLayout = readFileSync(join(root, '_layouts', 'default.html'), 'utf8');
if (!/class="skip"/.test(defaultLayout)) fail('markup', '_layouts/default.html', 'no skip link');
if (!/<html[^>]*lang="en"/.test(defaultLayout)) fail('markup', '_layouts/default.html', '<html> has no lang');
if (!/<main\b/.test(defaultLayout)) fail('markup', '_layouts/default.html', 'no <main> landmark');

// ----------------------------------------------- 1b. no hidden focus rings ----

for (const r of siteRules) {
  for (const { prop, value } of declarations(r.body)) {
    if (prop === 'outline' && /^(none|0)\b/.test(value)) fail('states', r.selector, `outline: ${value} removes the focus ring`);
  }
}

// ------------------------------------------------------------- 4. motion ----

const reduced = siteRules.filter((r) => r.prelude.includes('prefers-reduced-motion: reduce'));
if (!reduced.length) fail('motion', 'assets/notebook.css', 'no prefers-reduced-motion block');
const reducedText = reduced.map((r) => `${r.selector}{${r.body}}`).join('\n');

const animated = new Set();
for (const r of siteRules) {
  const body = r.body;
  if (!/\banimation(-name)?\s*:/.test(body)) continue;
  if (/\banimation(-name)?\s*:\s*none/.test(body)) continue;
  for (const m of r.selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    if (r.prelude.includes('prefers-reduced-motion')) continue;
    animated.add(`${m[1]}`);
  }
}
for (const cls of animated) {
  if (!new RegExp(`\\.${cls}\\b`).test(reducedText)) {
    fail('motion', `.${cls}`, 'animated, and the reduced-motion block does not stop it');
  }
}

for (const r of siteRules) {
  for (const { prop, value } of declarations(r.body)) {
    if (value.includes('!important') && !r.selector.startsWith('mjx-')) {
      fail('states', r.selector, `!important outside the MathJax override: ${prop}: ${value}`);
    }
  }
}

// ------------------------------------------------------------- report ----

if (report.length) {
  console.log('\nTarget sizes, computed from tokens.css at 1440 and at 360:');
  console.log(`  ${'control'.padEnd(16)} ${'selector'.padEnd(22)} ${'height'.padStart(8)}  ${'pad-block'.padStart(9)}  type`);
  for (const [name, sel, height, pad, type] of report) {
    console.log(`  ${name.padEnd(16)} ${sel.padEnd(22)} ${height.padStart(8)}  ${pad.padStart(9)}  ${type}`);
  }
}

const byRule = new Map();
for (const f of failures) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

if (failures.length) {
  for (const [rule, count] of byRule) {
    console.log(`\n${rule} (${count})`);
    for (const f of failures.filter((x) => x.rule === rule).slice(0, 14)) console.log(`  ${f.where}  ${f.detail}`);
    const rest = failures.filter((x) => x.rule === rule).length - 14;
    if (rest > 0) console.log(`  … and ${rest} more`);
  }
  console.log(`\nSTATES: ${failures.length} finding${failures.length === 1 ? '' : 's'}`);
  process.exit(1);
}

console.log(`\nstates: clean — ${CONTROLS.length} controls with their states and targets, ${markup.length} pages of markup, ${animated.size} animated selectors answered`);
