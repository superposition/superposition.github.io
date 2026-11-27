import { readFileSync } from 'node:fs';

/* Measures every colour pair the components ship, for each of the three
   identities in assets/tokens.css. Text must clear 4.5:1, a control edge 3:1;
   a divider is printed for the record and has no minimum.
   Run: npm run contrast

   The pairs are the components' own list: one line per job a colour has, named
   by the token that does it. Token names carry their -- so the slop check can
   see that a token is read by something. */

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
  const v = tokens[name.replace(/^--/, '')];
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
  // Type
  ['body type',            '--star',         '--void',        'text'],
  ['body type on block',   '--star',         '--surface',     'text'],
  ['secondary type',       '--starlight',    '--void',        'text'],
  ['secondary on block',   '--starlight',    '--surface',     'text'],
  ['meta / caption',       '--dust',         '--void',        'text'],
  ['meta on block',        '--dust',         '--surface',     'text'],
  ['chrome link',          '--accent-text',  '--void',        'text'],
  ['chrome link on block', '--accent-text',  '--surface',     'text'],
  ['chrome hover',         '--accent-peak',  '--void',        'text'],
  ['prose link',           '--nebula-text',  '--void',        'text'],
  ['prose link on block',  '--nebula-text',  '--surface',     'text'],
  ['state type',           '--state-text',   '--void',        'text'],
  ['state type on block',  '--state-text',   '--surface',     'text'],
  ['alert type',           '--alert-text',   '--void',        'text'],
  ['alert type on block',  '--alert-text',   '--surface',     'text'],

  // Edges and dividers
  ['alert edge',           '--alert',        '--void',        'edge'],
  ['alert edge on block',  '--alert',        '--surface',     'edge'],
  ['focus ring',           '--state',        '--void',        'edge'],
  ['focus ring in block',  '--state',        '--surface',     'edge'],
  ['HUD corner',           '--accent',       '--void',        'edge'],
  ['quotation edge',       '--plum-mark',    '--void',        'edge'],
  ['notice edge',          '--state',        '--surface',     'edge'],
  ['hairline rule',        '--line',         '--void',        'divider'],
  ['hairline in block',    '--line',         '--surface',     'divider'],
  ['gauge rail',           '--rail',         '--void',        'divider'],

  // The chip and the film: a label on the page, and a label over a photograph.
  ['chip type',            '--chip-text',    '--chip-bg',     'text'],
  ['chip film',            '--chip-bg',      '--void',        'divider'],
  ['chip edge',            '--chip-edge',    '--void',        'divider'],
  ['film type',            '--film-text',    '--film-bg',     'text'],

  // Button: one fill, one action.
  ['button type',          '--void',         '--accent',      'text'],
  ['button hover type',    '--void',         '--accent-peak', 'text'],
  ['button hover edge',    '--star',         '--void',        'edge'],
  ['disabled type',        '--dust',         '--void',        'text'],
  ['disabled edge',        '--dust',         '--void',        'edge'],

  // Table, definition row, range, notice: the data components.
  ['table head',           '--dust',         '--void',        'text'],
  ['table cell',           '--starlight',    '--void',        'text'],
  ['table cell link',      '--accent-text',  '--void',        'text'],
  ['table note',           '--dust',         '--void',        'text'],
  ['def label',            '--dust',         '--void',        'text'],
  ['def value',            '--star',         '--void',        'text'],
  ['range rest',           '--dust',         '--void',        'text'],
  ['range hover',          '--star',         '--void',        'text'],
  ['range current',        '--accent-text',  '--void',        'text'],
  ['notice title',         '--star',         '--surface',     'text'],
  ['notice text',          '--starlight',    '--surface',     'text'],
  ['skeleton label',       '--dust',         '--deep',        'text'],

  // States and blocks
  ['empty title',          '--starlight',    '--void',        'text'],
  ['empty body',           '--dust',         '--void',        'text'],
  ['footer type',          '--dust',         '--void',        'text'],
  ['footer link',          '--starlight',    '--void',        'text'],
  ['audio note',           '--dust',         '--void',        'text'],
  ['entry stamp',          '--dust',         '--void',        'text'],
  ['entry state mark',     '--state',        '--void',        'edge'],
  ['topic dot',            '--accent',       '--void',        'divider'],
  ['card hover edge',      '--line',         '--void',        'divider'],

  // The series: the same five emitted values, measured where the cast uses them.
  ['series signal',        '--amber',        '--void',        'text'],
  ['series signal block',  '--amber',        '--surface',     'text'],
  ['series second',        '--cyan',         '--void',        'text'],
  ['series second block',  '--cyan',         '--surface',     'text'],
  ['series body',          '--cream',        '--void',        'text'],
  ['series body block',    '--cream',        '--surface',     'text'],
  ['series outline',       '--void',         '--cream',       'edge'],

  // The campaign poster: every pair its type sets, on the void band.
  ['poster title',         '--star',         '--void',        'text'],
  ['poster film line',     '--accent-text',  '--void',        'text'],
  ['poster genre',         '--state-text',   '--void',        'text'],
  ['poster logline',       '--starlight',    '--void',        'text'],
  ['poster credits',       '--dust',         '--void',        'text'],
  ['poster release film',  '--film-text',    '--film-bg',     'text'],
  ['poster focus ring',    '--state',        '--void',        'edge'],
  ['poster lit edge',      '--poster-edge',  '--void',        'divider'],
  ['poster frame',         '--poster-metal', '--void',        'divider'],
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
    const ground = over(resolve(tokens, '--void'), '#000000');
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
