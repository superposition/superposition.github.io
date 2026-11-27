import { readFileSync } from 'node:fs';

/* Measures every colour pair the components ship, for each of the three
   identities in assets/tokens.css. Text must clear 4.5:1, a control edge 3:1;
   a divider is printed for the record and has no minimum.
   Run: npm run contrast */

const file = process.argv[2] ?? new URL('../../assets/tokens.css', import.meta.url);
const css = readFileSync(file, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@charset[^;]+;/g, '');

// Split the file into one block per selector, keeping declaration order.
const blocks = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim();
  const decls = {};
  for (const d of m[2].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim();
  if (Object.keys(decls).length) blocks.push({ selector, decls });
}
const pick = (sel) => blocks.filter((b) => b.selector === sel).reduce((a, b) => ({ ...a, ...b.decls }), {});
const IDENTITIES = [
  ['shipped (default)', pick(':root')],
  ['instrument (a)', { ...pick(':root'), ...pick('html[data-lab="a"]') }],
  ['poster (b)', { ...pick(':root'), ...pick('html[data-lab="b"]') }],
];

const resolve = (tokens, name, depth = 0) => {
  const v = tokens[name];
  if (v == null) return null;
  const m = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (m && depth < 4) return resolve(tokens, m[1], depth + 1);
  return v;
};
const parse = (v) => {
  if (v === 'transparent') return [0, 0, 0, 0];
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)).concat(1);
  const n = (v.match(/[\d.]+/g) || []).map(Number);
  if (n.length < 3) return null;
  return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
};
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const over = (fg, bg) => {
  const f = parse(fg), b = parse(bg);
  if (!f || !b) return null;
  return toHex([0, 1, 2].map((i) => f[i] * f[3] + b[i] * (1 - f[3])));
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [name, foreground token, background token, kind]
const PAIRS = [
  ['body type',            'star',        'void',         'text'],
  ['secondary type',       'starlight',   'void',         'text'],
  ['meta / caption',       'dust',        'void',         'text'],
  ['chrome link',          'accent-text', 'void',         'text'],
  ['chrome link on block', 'accent-text', 'surface',      'text'],
  ['prose link',           'nebula-text', 'void',         'text'],
  ['prose link on block',  'nebula-text', 'surface',      'text'],
  ['state type',           'state-text',  'void',         'text'],
  ['state type on block',  'state-text',  'surface',      'text'],
  ['alert type',           'alert-text',  'void',         'text'],
  ['alert type on block',  'alert-text',  'surface',      'text'],
  ['alert edge',           'alert',       'void',         'edge'],
  ['alert edge on block',  'alert',       'surface',      'edge'],
  ['decal type',           'decal-text',  'decal-bg',     'text'],
  ['body type on block',   'star',        'surface',      'text'],
  ['secondary on block',   'starlight',   'surface',      'text'],
  ['meta on block',        'dust',        'surface',      'text'],
  ['topic dot fill',       'plum-mark',   'void',         'edge'],
  ['primary button type',  'void',        'accent',       'text'],
  ['primary active type',  'void',        'accent',       'text'],
  ['secondary type',       'star',        'void',         'text'],
  ['secondary hover type','accent-text',  'void',         'text'],
  ['ghost type',           'starlight',   'void',         'text'],
  ['ghost hover type',     'star',        'surface',      'text'],
  ['disabled type',        'dust',        'void',         'text'],
  ['callout title',        'star',        'surface',      'text'],
  ['callout body',         'starlight',   'surface',      'text'],
  ['empty title',          'starlight',   'void',         'text'],
  ['empty body',           'dust',        'void',         'text'],
  ['badge type',           'dust',        'void',         'text'],
  ['badge accent type',    'accent-text', 'void',         'text'],
  ['badge state type',     'state-text',  'void',         'text'],
  ['badge solid type',     'starlight',   'surface',      'text'],
  ['focus ring',           'state',       'void',         'edge'],
  ['focus ring in block',  'state',       'surface',      'edge'],
  // The gauge rail groups a section the way a rule does; it is not a control
  // edge, so in the poster identity, where it is a hairline, it has no floor.
  ['gauge rail',           'rail',        'void',         'divider'],
  ['HUD corner',           'accent',      'void',         'edge'],
  ['secondary edge',       'dust',        'void',         'edge'],
  ['secondary hover edge','accent-text',  'void',         'edge'],
  ['primary hover edge',   'star',        'void',         'edge'],
  ['ghost hover edge',     'dust',        'surface',      'edge'],
  ['disabled edge',        'dust',        'void',         'edge'],
  ['callout edge',         'state',       'surface',      'edge'],
  ['callout edge on page', 'state',       'void',         'edge'],
  ['blockquote edge',      'plum-mark',   'void',         'edge'],
  ['badge edge',           'dust',        'void',         'edge'],
  ['badge accent edge',    'accent-text', 'void',         'edge'],
  ['badge state edge',     'state-text',  'void',         'edge'],
  // The series: the same five emitted values, measured where the cast uses them.
  ['series signal',        'amber',       'void',         'text'],
  ['series signal block',  'amber',       'surface',      'text'],
  ['series second',        'cyan',        'void',         'text'],
  ['series second block',  'cyan',        'surface',      'text'],
  ['series body',          'cream',       'void',         'text'],
  ['series body block',    'cream',       'surface',      'text'],
  ['series alert type',    'alert-text',  'surface',      'text'],
  ['series alert mark',    'alert',       'void',         'edge'],
  ['series alert block',   'alert',       'surface',      'edge'],
  ['series outline',       'void',        'cream',       'edge'],
  ['hairline rule',        'line',        'void',         'divider'],
  ['hairline in block',    'line',        'surface',      'divider'],
  ['ghost hover fill',     'surface',     'void',         'divider'],
];

let failures = 0;
for (const [label, tokens] of IDENTITIES) {
  console.log(`\n${label}`);
  let local = 0;
  for (const [name, fgToken, bgToken, kind] of PAIRS) {
    const fgRaw = resolve(tokens, fgToken);
    const bgRaw = resolve(tokens, bgToken);
    if (!fgRaw || !bgRaw) { console.log(`  MISSING TOKEN ${fgToken} / ${bgToken} (${name})`); failures++; local++; continue; }
    // A translucent background is composited onto the ground first.
    const ground = over(resolve(tokens, 'void'), '#000000');
    const bg = over(bgRaw, ground);
    if (!bg) { console.log(`  UNREADABLE ${fgToken} / ${bgToken} (${name})`); failures++; local++; continue; }
    const fg = /^rgba|^transparent/.test(fgRaw) ? over(fgRaw, bg) : fgRaw;
    if (!fg) { console.log(`  UNREADABLE ${fgToken} (${name})`); failures++; local++; continue; }
    const r = ratio(fg, bg);
    const min = kind === 'text' ? 4.5 : kind === 'edge' ? 3 : 1;
    const pass = r >= min;
    if (!pass) { failures++; local++; }
    console.log(`  ${name.padEnd(22)} ${`${fgToken} on ${bgToken}`.padEnd(30)} ${(r.toFixed(2) + ':1').padStart(8)}  ${kind} ${min}:1 ${pass ? 'PASS' : 'FAIL'}`);
  }
  console.log(`  ${local ? `${local} BELOW MINIMUM` : 'all pairs pass'}`);
}
console.log(`\n${PAIRS.length * IDENTITIES.length} pairs over ${IDENTITIES.length} identities, ${failures} below minimum`);
process.exit(failures ? 1 : 0);
