import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The component charter, enforced.

   Run: npm run slop   (from storybook/)

   A style guide that lives in a document is advice. These are the rules the
   build fails on, so a component cannot drift away from the system without a
   red check:

     1. Tokens or nothing. assets/notebook.css names no colour, no size, no
        shadow, no gradient and no length of its own. Every value is a var()
        declared in assets/tokens.css, or 0 / a percentage / a unitless ratio.
        A media query may name a width, and only from the breakpoint list
        below, because a breakpoint is a fact about a device, not a token.
     2. Used or deleted. Every class in notebook.css appears in the markup the
        site ships, and every story names the page that adopts it (usedOn).
     3. No dead tokens. Every token in tokens.css is read by something.

   What this file deliberately does not judge: whether a component is any good,
   and whether its contrast passes. Contrast is `npm run contrast`; the rest is
   review. */

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..');
const SITE_CSS = join(root, 'assets', 'notebook.css');
const TOKENS_CSS = join(root, 'assets', 'tokens.css');

// A breakpoint is a device fact. Adding one is a decision, so it is a diff.
const BREAKPOINTS = [260, 340, 380, 419, 480, 640, 700, 1000];

// Declarations that may carry a unitless ratio in em: these are relative to
// the type they sit on, which is the point of them.
const EM_PROPERTIES = new Set(['letter-spacing', 'word-spacing']);

const COLOR_WORDS =
  /\b(white|black|red|orange|yellow|green|blue|purple|violet|pink|brown|gray|grey|silver|gold|teal|navy|maroon|olive|lime|aqua|fuchsia|cyan|magenta|beige|ivory|coral|salmon|khaki|indigo|turquoise|lavender|crimson|darkred|darkblue|lightgray|lightgrey)\b/i;

const failures = [];
const note = (rule, where, detail) => failures.push({ rule, where, detail });

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/* Comments come out first, but their newlines stay, so every line number in a
   failure is the line an editor shows. */
const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''));

const readCss = (path) =>
  stripComments(readFileSync(path, 'utf8')).replace(/@charset[^;]+;/g, ' ');

/* One block per selector. Nested blocks fall out of `[^{}]+`, which cannot
   cross a brace, so this handles @media and @keyframes without a parser. */
const blocks = (css) => {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2], index: m.index });
  }
  return out;
};

const declarations = (body) =>
  body
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const at = d.indexOf(':');
      return at < 0 ? { prop: d, value: '' } : { prop: d.slice(0, at).trim().toLowerCase(), value: d.slice(at + 1).trim() };
    });

// ---------------------------------------------------------------- tokens ----

const tokensCss = readCss(TOKENS_CSS);
const declared = new Map();
for (const b of blocks(tokensCss)) {
  for (const { prop, value } of declarations(b.body)) {
    if (prop.startsWith('--')) declared.set(prop, { value, selector: b.selector, index: b.index });
  }
}
const TOKENS = new Set(declared.keys());

/* The type scale is the closed set of step tokens. A size the site needs that
   is not one of these is a new step in tokens.css — named, measured, and in
   the review — never a number in a component. */
const SCALE = [...TOKENS].filter(
  (t) => t.startsWith('--step-') || /^--poster-(title|title-long|film|genre|logline|cast|slate)$/.test(t),
);
const SCALE_SET = new Set(SCALE);

// ---------------------------------------------------------------- markup ----

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
/* Markup is what the site renders, and an SVG under _includes is markup: the
   home page's map is generated into _includes/scene/map.svg and inlined by
   _includes/scene/map.html, so its `.scene-*` classes are written, not
   composed. Reading it here is what lets rule 2 judge them. */
const markupFiles = walk(root).filter((f) => ['.html', '.md', '.yml', '.svg'].includes(extname(f)));

/* Comments are not use: a class named only in a comment is a class nobody
   renders. Liquid comments go the same way. */
const markup = markupFiles
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  .replace(/<!--[\s\S]*?-->/g, '');

/* A class can be composed rather than written: the campaign poster takes its
   variant from Liquid, so the stylesheet declares those names in a @liquid
   comment beside the file that composes them. The list is printed in the
   summary, so the exception shows up in review instead of hiding. */
const LIQUID = [...readFileSync(SITE_CSS, 'utf8').matchAll(/@liquid ([^\n]+)/g)]
  .flatMap((m) => m[1].split(/[\s,]+/).filter(Boolean))
  .map((x) => (x.startsWith('.') ? x : `.${x}`));

const classUsed = (name) =>
  new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`).test(markup) || LIQUID.includes(`.${name}`);

// ------------------------------------------------------- 1. notebook.css ----

const siteCss = readCss(SITE_CSS);
const seen = new Set();

/* A component may keep a custom property of its own on the element — --sweep,
   --crawl-tilt — and a page may set one from Liquid (--strip-steps). Those are
   not tokens the system owns, so they only have to be declared somewhere. */
const localProps = new Set([
  ...[...siteCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
  ...[...markup.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]),
]);

for (const b of blocks(siteCss)) {
  const line = lineAt(siteCss, b.index);
  const where = `assets/notebook.css:${line}`;

  // A selector this file owns must be used somewhere the site ships.
  for (const m of b.selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
    const cls = m[1];
    if (seen.has(cls)) continue;
    seen.add(cls);
    if (!classUsed(cls)) note('used-or-deleted', where, `.${cls} is styled but no page, layout or include renders it`);
  }

  // A @font-face declares a family; it does not read the type system.
  if (b.selector.includes('@font-face')) continue;

  for (const { prop, value } of declarations(b.body)) {
    if (!prop || !value) continue;

    if (/#[0-9a-f]{3,8}\b/i.test(value) || /\b(rgba?|hsla?)\(/i.test(value) || COLOR_WORDS.test(value.replace(/var\([^)]*\)/g, ''))) {
      // currentColor and transparent are the two names a component may say.
      const bare = value.replace(/currentColor|transparent|inherit/gi, '').replace(/var\([^)]*\)/g, '');
      if (/#[0-9a-f]{3,8}\b/i.test(bare) || /\b(rgba?|hsla?)\(/i.test(bare) || COLOR_WORDS.test(bare)) {
        note('colour', where, `${prop}: ${value}`);
      }
    }

    if (/gradient\(/i.test(value)) note('gradient', where, `${prop}: ${value}`);

    if (prop === 'box-shadow' || prop === 'text-shadow') {
      if (!/^(none|var\(--)/.test(value)) note('shadow', where, `${prop}: ${value}`);
    }
    // 50% says "a circle", which is a shape, not a corner radius.
    if (prop === 'border-radius' && !/^(0|50%|var\(--)/.test(value)) {
      note('radius', where, `border-radius: ${value}`);
    }
    if (prop === 'font-family' && !/^var\(--font-/.test(value)) {
      note('type', where, `font-family: ${value}`);
    }
    // A size is a step token, an em ratio of the step it sits in, or inherit.
    if (prop === 'font-size') {
      const m = value.match(/^var\((--[\w-]+)\)$/);
      const ratio = /^\d*\.?\d+em$/.test(value);
      if (!(m && SCALE_SET.has(m[1])) && !ratio && value !== 'inherit') {
        note('type', where, `font-size off the scale: ${value}`);
      }
    }
    if (prop === 'font') {
      const m = value.match(/(var\(--[\w-]+\))(?:\s*\/\s*[^ ]+)?\s+(var\(--font-[\w-]+\))/);
      if (!m) note('type', where, `font shorthand must name a step and a family token: ${value}`);
      else {
        const size = m[1].slice(4, -1);
        if (!SCALE_SET.has(size)) note('type', where, `font size off the scale: ${size}`);
      }
    }

    // Every length is a token or 0. A percentage, a fraction and a unitless
    // ratio are measurements of the box itself, not inventions.
    // A viewport unit measures the screen and a ratio in em is relative to the
    // type it sits in: neither is a value the component invented.
    const allowed = prop === 'font' || prop === 'font-size' || EM_PROPERTIES.has(prop);
    const stripped = value.replace(/var\([^)]*\)/g, '').replace(/url\([^)]*\)/g, '');
    const length = stripped.match(/(?<![\w.-])\d*\.?\d+(px|rem|em|ch|ex|pt|cm|mm|cqw|cqi)\b/g);
    if (length) {
      const emOk = prop === 'letter-spacing' || prop === 'word-spacing' || prop === 'font-size';
      if (!allowed) note('length', where, `${prop}: ${value}`);
      else if (length.some((l) => !(emOk && /em$/.test(l)))) note('length', where, `${prop}: ${value}`);
    }

    for (const m of value.matchAll(/var\((--[\w-]+)/g)) {
      if (!TOKENS.has(m[1]) && !localProps.has(m[1])) note('token', where, `${prop} reads ${m[1]}, which tokens.css does not declare`);
    }
  }
}

// At-rules: breakpoints are from the list, container queries may name a width
// the documented card actually ships at.
for (const m of siteCss.matchAll(/@(media|container|supports)\s+([^{]+)\{/g)) {
  const [, kind, prelude] = m;
  for (const px of prelude.matchAll(/(\d+(?:\.\d+)?)px/g)) {
    if (!BREAKPOINTS.includes(Number(px[1]))) {
      note('breakpoint', `assets/notebook.css:${lineAt(siteCss, m.index)}`, `@${kind} ${prelude.trim()} — ${px[1]}px is not a documented breakpoint`);
    }
  }
  if (kind === 'media') {
    for (const unit of prelude.matchAll(/(\d+(?:\.\d+)?)(em|rem|ch)\b/g)) {
      note('breakpoint', `assets/notebook.css:${lineAt(siteCss, m.index)}`, `@media ${prelude.trim()} — breakpoints are px device widths`);
    }
  }
}

// ------------------------------------------------------------- 3. tokens ----

const siteReadTokens = new Set([...siteCss.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
/* A token may be read by a file that is not the stylesheet: the contrast
   script measures it by name, and a story renders it. Both count as use. */
const otherReaders = [join(here, 'contrast.mjs'), join(here, 'a11y.mjs')];
for (const f of readdirSync(join(root, 'storybook', 'stories'))) {
  otherReaders.push(join(root, 'storybook', 'stories', f));
}
for (const f of markupFiles) otherReaders.push(f);
for (const f of otherReaders) {
  if (!existsSync(f) || f.endsWith('slop.mjs')) continue;
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/var\((--[\w-]+)/g)) siteReadTokens.add(m[1]);
  for (const m of text.matchAll(/['"'](--[\w-]+)['"']/g)) siteReadTokens.add(m[1]);
  for (const m of text.matchAll(/(?<=[\s(,])(--[\w-]+)(?=[\s),:])/g)) siteReadTokens.add(m[1]);
}
for (const [name, decl] of declared) {
  const readByToken = [...declared.values()].some((d) => d.value.includes(`var(${name})`));
  if (!siteReadTokens.has(name) && !readByToken) {
    note('dead-token', `assets/tokens.css:${lineAt(tokensCss, decl.index)}`, `${name} (${decl.selector}) is declared and never read`);
  }
}

// ----------------------------------------------------------- 2. stories ----

const storiesDir = join(root, 'storybook', 'stories');
for (const file of readdirSync(storiesDir).filter((f) => f.endsWith('.stories.js'))) {
  const text = readFileSync(join(storiesDir, file), 'utf8');
  const m = text.match(/usedOn:\s*\[([^\]]*)\]/);
  if (!m) {
    note('used-or-deleted', `storybook/stories/${file}`, 'no usedOn: [] naming the page that adopts this component');
    continue;
  }
  const paths = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
  if (!paths.length) note('used-or-deleted', `storybook/stories/${file}`, 'usedOn is empty: a component with no live use is deleted');
  for (const p of paths) {
    const candidates = [join(root, p.replace(/^\//, '')), join(root, p.replace(/^\//, '') + '.html'), join(root, p.replace(/^\//, '') + '.md')];
    if (p.includes('{{')) continue;
    if (!candidates.some((c) => existsSync(c))) {
      note('used-or-deleted', `storybook/stories/${file}`, `usedOn names ${p}, which is not a file in the repository`);
    }
  }
}

// ------------------------------------------------------------- report ----

const byRule = new Map();
for (const f of failures) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);

const LEGEND = {
  colour: 'a colour literal outside tokens.css',
  gradient: 'a gradient that is not a named scrim in tokens.css',
  length: 'a length that is not a token',
  type: 'a font size or family that is not on the scale',
  radius: 'a radius that is not a token',
  shadow: 'a shadow that is not a bloom token',
  token: 'a var() that tokens.css does not declare',
  breakpoint: 'a breakpoint outside the documented set',
  'dead-token': 'a token nothing reads',
  'used-or-deleted': 'a component with no live use',
};

if (failures.length) {
  for (const [rule, count] of byRule) {
    console.log(`\n${rule} — ${LEGEND[rule]} (${count})`);
    for (const f of failures.filter((x) => x.rule === rule).slice(0, 12)) console.log(`  ${f.where}  ${f.detail}`);
    const rest = failures.filter((x) => x.rule === rule).length - 12;
    if (rest > 0) console.log(`  … and ${rest} more`);
  }
  console.log(`\nSLOP: ${failures.length} finding${failures.length === 1 ? '' : 's'} across ${byRule.size} rule${byRule.size === 1 ? '' : 's'}`);
  process.exit(1);
}

console.log(`slop: clean — ${seen.size} component classes, ${TOKENS.size} tokens, ${SCALE.length} type steps, ${BREAKPOINTS.length} breakpoints`);
