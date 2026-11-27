export default {
  title: 'Components/Definition row',
  parameters: {
    usedOn: ['_layouts/repo.html'],
    docs: {
      description: {
        component:
          'A label and its value, for the facts a repository page opens with: language, stars, last push. One hairline per fact, the label at --step-1 mono in --dust (7.51:1), the value at --step-2 mono 500 in --star (16.93:1) with tabular figures. Three across at 1200, one per row under 420. It replaced a line of plain meta text, which gave the three facts the same weight as the tagline above them.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

const def = (rows) => `<dl class="def">${rows
  .map(([label, value]) => `<div class="def-row"><dt>${label}</dt><dd>${value}</dd></div>`)
  .join('')}</dl>`;

export const Repository = {
  args: {
    note: 'The shipped set: mage, a Python repository with 6 stars, last pushed 11 Sep 2026.',
    body: def([['Language', 'Python'], ['Stars', '6'], ['Last push', '<time datetime="2026-09-11">11 Sep 2026</time>']]),
  },
};

export const ZeroStars = {
  args: {
    note: 'A repository with no stars and no language reported: the zero prints, because 0 is a fact and an empty cell is not.',
    body: def([['Language', 'C'], ['Stars', '0'], ['Last push', '<time datetime="2025-12-07">7 Dec 2025</time>']]),
  },
};

export const TwoFacts = {
  args: {
    note: 'A page with less to say: two rows. The grid fills what it has and does not leave an empty column.',
    body: def([['Language', 'Cairo'], ['Last push', '<time datetime="2025-12-16">16 Dec 2025</time>']]),
  },
};
