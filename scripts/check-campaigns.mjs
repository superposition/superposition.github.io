/* Checks the campaign data against the site it sits on.
   Run: node scripts/check-campaigns.mjs
   Prints every problem and exits non-zero if there is one.

   The join is `slug`: a campaign without a repository page is a poster for
   nothing, and a repository page without a campaign is a library the programme
   forgot. Loglines are held to twenty words because the poster has no room for
   a second sentence. Every still has to exist, because a poster with a broken
   image is worse than a typographic one. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const failures = [];

/* A reader for the subset of YAML this file uses: a list of flat records with
   a scalar list, an inline list and a list of maps. Anything outside that
   subset is reported rather than guessed, which is the point of the check. */
const unquote = (v) => v.trim().replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1');
const scalar = (v) => {
  const s = unquote(v);
  const inline = s.match(/^\[(.*)\]$/);
  return inline ? inline[1].split(',').map(unquote).filter(Boolean) : s;
};
const splitKV = (s) => {
  const at = s.indexOf(': ');
  return at === -1 ? [s.replace(/:$/, ''), ''] : [s.slice(0, at), s.slice(at + 2)];
};

const campaigns = [];
let record = null;
let listKey = null;
let mapItem = null;
for (const raw of read('_data/campaigns.yml').replace(/\r/g, '').split('\n')) {
  if (!raw.trim() || raw.trim().startsWith('#')) continue;
  const indent = raw.match(/^ */)[0].length;
  const body = raw.slice(indent).trimEnd();

  if (indent === 0 && body.startsWith('- ')) {
    record = {};
    campaigns.push(record);
    listKey = null;
    mapItem = null;
    const [k, v] = splitKV(body.slice(2));
    record[k] = scalar(v);
    continue;
  }
  if (!record) { failures.push(`campaigns.yml: content before the first record: ${body}`); continue; }

  if (indent === 2) {
    const [k, v] = splitKV(body);
    if (v === '') { record[k] = []; listKey = k; mapItem = null; }
    else { record[k] = scalar(v); listKey = null; mapItem = null; }
    continue;
  }
  if (indent === 4 && body.startsWith('- ')) {
    const item = body.slice(2);
    if (item.includes(': ')) {
      mapItem = {};
      const [k, v] = splitKV(item);
      mapItem[k] = scalar(v);
      record[listKey].push(mapItem);
    } else {
      record[listKey].push(scalar(item));
      mapItem = null;
    }
    continue;
  }
  if (indent === 6 && mapItem) {
    const [k, v] = splitKV(body);
    mapItem[k] = scalar(v);
    continue;
  }
  failures.push(`campaigns.yml: unreadable line: ${raw.trim()}`);
}

const repoSlugs = readdirSync(new URL('_repos/', root))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''));

const seen = new Set();
for (const c of campaigns) {
  const where = `campaign ${c.slug}`;
  if (!c.slug) { failures.push('a campaign has no slug'); continue; }
  if (seen.has(c.slug)) failures.push(`${where}: listed twice`);
  seen.add(c.slug);
  if (!repoSlugs.includes(c.slug)) failures.push(`${where}: no _repos/${c.slug}.md`);

  for (const field of ['title', 'film', 'genre', 'runtime', 'logline']) {
    if (!c[field]) failures.push(`${where}: no ${field}`);
  }
  if (c.logline) {
    const words = c.logline.replace(/[—–]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 20) failures.push(`${where}: logline is ${words.length} words, the limit is 20`);
  }
  if (!Array.isArray(c.cast) || c.cast.length === 0) failures.push(`${where}: no cast`);
  const stills = Array.isArray(c.stills) ? c.stills : [];
  if (stills.length < 1 || stills.length > 3) failures.push(`${where}: ${stills.length} stills, wanted 1 to 3`);
  for (const s of stills) {
    if (!s || !s.src) { failures.push(`${where}: a still has no src`); continue; }
    if (!existsSync(new URL(`.${s.src}`, root))) failures.push(`${where}: still missing on disk: ${s.src}`);
    if (!s.alt) failures.push(`${where}: still ${s.src} has no alt`);
    if (!s.credit) failures.push(`${where}: still ${s.src} has no credit`);
  }
}

for (const slug of repoSlugs) {
  if (!seen.has(slug)) failures.push(`_repos/${slug}.md has no campaign`);
}

if (failures.length) {
  console.error(`campaigns: ${failures.length} problem${failures.length === 1 ? '' : 's'}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`campaigns: ${campaigns.length} campaigns, ${repoSlugs.length} repository pages, all joined`);
