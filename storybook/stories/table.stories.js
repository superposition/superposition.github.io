/* Real rows from _data/repos.yml, in the file's order: newest push first. */
const rows = [
  ['superposition.github.io', 'website', 'CSS', 0, '2026-11-26', 'https://github.com/superposition/superposition.github.io'],
  ['bend-ml-lab', 'Einsum, training epochs, and weight-space diagnostics in Bend 2 — measured, with C/Node/NumPy twins', 'C', 0, '2026-11-20', 'https://github.com/superposition/bend-ml-lab'],
  ['DIVULGE', 'A native Rust/egui investigation workbench that makes AI-assisted reverse engineering understandable', 'Rust', 1, '2026-11-13', 'https://github.com/superposition/DIVULGE'],
  ['91', 'NAIWAN 91 — city pop and coastal firmware for the M-VAVE FM-1', 'C', 1, '2026-11-13', 'https://github.com/superposition/91'],
  ['mage', 'GPU profiler TUI for Triton/CUDA kernels with nsys/ncu integration', 'Python', 6, '2026-09-11', 'https://github.com/superposition/mage'],
];

const row = ([name, note, language, stars, pushed, url]) => `<tr>
  <td><a href="${url}">${name}</a><span class="table-note">${note}</span></td>
  <td class="nowrap">${language || '—'}</td>
  <td class="num">${stars}</td>
  <td class="nowrap"><time datetime="${pushed}">${pushed}</time></td>
</tr>`;

const table = (cls, rows) => `<table class="table ${cls}">
  <caption>Every public repository on github.com/superposition, newest push first</caption>
  <thead><tr><th scope="col">Repository</th><th scope="col">Language</th><th scope="col" class="num">Stars</th><th scope="col" class="nowrap">Last push</th></tr></thead>
  <tbody>${rows.map(row).join('')}</tbody>
</table>`;

export default {
  title: 'Components/Table',
  parameters: {
    usedOn: ['projects.md'],
    docs: {
      description: {
        component:
          'The data density. /projects/ lists 33 public repositories in one table: name and description, language, stars, last push. Four columns, tabular figures, stars right-aligned so a column of counts is a column. --compact sets --density-row and --density-cell one step down from the reading density (12px/16px rows become 8px/12px) and nothing else changes. Measured: head --dust 7.51:1, cell --starlight 15.44:1, name --accent-text 13.07:1, the link is the whole cell so a phone target is the column, not the words.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Compact = {
  args: {
    note: 'The density /projects/ ships: --space-1 rows, --space-2 between columns, the head at --step-decal. Five real rows in the file s own order.',
    body: table('table--compact', rows),
  },
};

export const Comfortable = {
  args: {
    note: 'The reading density: the same table with --space-2 rows and --space-3 between columns. Used where a table is read rather than scanned, such as the identity table on /style/.',
    body: table('', rows),
  },
};

export const LongList = {
  args: {
    note: 'The whole index is one table, not a card grid: 33 rows at 1440, each 42px in the compact density, so the reader scans a column instead of scrolling cards.',
    body: table('table--compact', [...rows, ...rows.slice(0, 3).map(([n, d, l, s, p, u]) => [n + '-lab', d, l, s, p, u])]),
  },
};

export const InProse = {
  args: {
    note: 'A prose table, set by kramdown in an entry: the same rules without the class, so a markdown table in an entry and a data table on a page cannot look like two different systems.',
    body: '<div class="prose"><table><thead><tr><th>Token</th><th>Measured</th><th>Job</th></tr></thead><tbody><tr><td>--star</td><td>16.93:1</td><td>headings and body</td></tr><tr><td>--dust</td><td>7.51:1</td><td>meta, captions, table head</td></tr><tr><td>--accent-text</td><td>13.07:1</td><td>chrome links</td></tr></tbody></table></div>',
  },
};
