const entries = [
  ['2026-11-22', 'Example — a fifth, a semitone, and 700 cents', 'An example music entry kept in drafts. It proves the audio element and the mathematics in a music entry.'],
  ['2026-11-21', 'Example — motion in one frame and another', 'An example entry kept in drafts, with inline and display mathematics and a figure.'],
  ['2026-11-20', 'Example — what a matrix does to a basis', 'A change of basis, read as a statement about where the arrows go.'],
];

const row = ([date, title, dek]) => `<li><a class="entry" href="#storybook-root"><span class="entry-date"><time datetime="${date}">${date}</time></span><span class="entry-title">${title}</span>${dek ? `<span class="entry-dek">${dek}</span>` : ''}</a></li>`;

export default {
  title: 'Components/Entry list',
  parameters: {
    usedOn: ['journal.html', 'index.html'],
    docs: {
      description: {
        component:
          'A journal row: the ISO stamp in mono with tabular figures, a 6px --state mark drawn with a background so no reader hears it, then the title and the dek in the text face. /journal/ groups the rows by topic; the home page shows the ten newest. The three rows here are the three draft entries in _drafts/, which are the only writing in the repository — the site publishes no entries today, so a --drafts build is where this component renders on a page. Measured: stamp --dust 7.51:1, title --accent-text 13.07:1, dek --starlight 15.44:1, row 33.5px tall.',
      },
    },
  },
  render: (args) => `<div class="wrap"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Default = {
  args: {
    note: 'The list, as /journal/ sets it. Hover a row: the hairline sweeps under the whole line and the title moves to --star.',
    body: `<ul class="entry-list">${entries.map(row).join('')}</ul>`,
  },
};

export const WithoutDek = {
  args: {
    note: 'No dek, because the entry has no description in its front matter: the title ends the line and the row still holds its grid.',
    body: `<ul class="entry-list">${entries.map(([d, t]) => row([d, t])).join('')}</ul>`,
  },
};

export const GroupedByTopic = {
  args: {
    note: 'How /journal/ groups: one h2 per topic, and a row list under it. A topic with no published entries is not rendered at all.',
    body: ['Matrices', 'Kinematics', 'Music']
      .map((topic, i) => `<section class="journal-topic"><h2>${topic}</h2><ul class="entry-list">${row(entries[i])}</ul></section>`)
      .join(''),
  },
};
