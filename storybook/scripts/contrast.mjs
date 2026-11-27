import { readFileSync } from 'node:fs';

/* Measures every colour pair the components ship. Text must clear 4.5:1, a
   control edge 3:1; a divider is printed for the record and has no minimum.
   Run: npm run contrast */
const css = readFileSync(process.argv[2] ?? new URL('../../assets/tokens.css', import.meta.url), 'utf8');
const tokens = {};
for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6}|rgba?\([^)]*\))/gi)) tokens[m[1]] = m[2];

const parse = (v) => {
  if (v.startsWith('#')) return [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)).concat(1);
  const n = v.match(/[\d.]+/g).map(Number);
  return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
};
const over = (fg, bg) => {
  const f = parse(fg), b = parse(bg);
  return '#' + [0, 1, 2].map(i => Math.round(f[i] * f[3] + b[i] * (1 - f[3])))
    .map(v => v.toString(16).padStart(2, '0')).join('');
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const pairs = [
  ['body type',           'star',        'void',        'text'],
  ['secondary type',      'starlight',   'void',        'text'],
  ['meta / caption',      'dust',        'void',        'text'],
  ['chrome link',         'rust-text',   'void',        'text'],
  ['prose link',          'nebula-text', 'void',        'text'],
  ['prose link on card',  'nebula-text', 'surface',     'text'],
  ['state type',          'teal-text',   'void',        'text'],
  ['topic dot fill',      'plum-mark',   'void',        'edge'],
  ['primary button type', 'void',        'rust-text',   'text'],
  ['primary active type', 'void',        'rust-text',   'text'],
  ['secondary type',      'star',        'void',        'text'],
  ['secondary hover type','rust-text',   'void',        'text'],
  ['ghost type',          'starlight',   'void',        'text'],
  ['ghost hover type',    'star',        'surface',     'text'],
  ['disabled type',       'dust',        'void',        'text'],
  ['callout title',       'star',        'surface',     'text'],
  ['callout body',        'starlight',   'surface',     'text'],
  ['empty title',         'starlight',   'void',        'text'],
  ['empty body',          'dust',        'void',        'text'],
  ['badge type',          'dust',        'void',        'text'],
  ['badge accent type',   'rust-text',   'void',        'text'],
  ['badge state type',    'teal-text',   'void',        'text'],
  ['badge solid type',    'starlight',   'surface',     'text'],
  ['focus ring',          'teal',        'void',        'edge'],
  ['focus ring in block', 'teal',        'surface',     'edge'],
  ['secondary edge',      'dust',        'void',        'edge'],
  ['secondary hover edge','rust-text',   'void',        'edge'],
  ['primary hover edge',  'star',        'void',        'edge'],
  ['ghost hover edge',    'dust',        'surface',     'edge'],
  ['disabled edge',       'dust',        'void',        'edge'],
  ['callout edge',        'teal',        'surface',     'edge'],
  ['callout edge on page','teal',        'void',        'edge'],
  ['blockquote edge',     'plum-mark',   'void',        'edge'],
  ['badge edge',          'dust',        'void',        'edge'],
  ['badge accent edge',   'rust-text',   'void',        'edge'],
  ['badge state edge',    'teal-text',   'void',        'edge'],
  ['hairline rule',       'line',        'void',        'divider'],
  ['hairline in block',   'line',        'surface',     'divider'],
  ['ghost hover fill',    'surface',     'void',        'divider'],
  ['series signal',       'amber',       'void',        'text'],
  ['series signal block', 'amber',       'surface',     'text'],
  ['series second',       'cyan',        'void',        'text'],
  ['series second block', 'cyan',        'surface',     'text'],
  ['series body',         'cream',       'void',        'text'],
  ['series body block',   'cream',       'surface',     'text'],
  ['series alert type',   'alert-text',  'surface',     'text'],
  ['series alert mark',   'alert',       'void',        'edge'],
  ['series alert block',  'alert',       'surface',     'edge'],
  ['series outline',      'void',        'cream',       'edge'],
];

let failures = 0;
const rows = [];
for (const [name, fgToken, bgToken, kind] of pairs) {
  const fg = tokens[fgToken], bg = tokens[bgToken];
  if (!fg || !bg) { rows.push([name, '?', '?', 'MISSING TOKEN']); failures++; continue; }
  const flat = over(bg, tokens.void);
  const shown = fg.startsWith('rgba') ? over(fg, flat) : fg;
  const r = ratio(shown, flat);
  const min = kind === 'text' ? 4.5 : kind === 'edge' ? 3 : 1;
  const pass = r >= min;
  if (!pass) failures++;
  rows.push([name, `${fgToken} on ${bgToken}`, r.toFixed(2) + ':1', `${kind} ${min}:1 ${pass ? 'PASS' : 'FAIL'}`]);
}
for (const r of rows) console.log([r[0].padEnd(22), r[1].padEnd(28), r[2].padStart(7), r[3]].join('  '));
console.log(`\n${rows.length} pairs, ${failures} below minimum`);
process.exit(failures ? 1 : 0);
