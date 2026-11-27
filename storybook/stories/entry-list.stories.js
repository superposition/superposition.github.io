const entries = [
  ['20 Nov 2026', 'What a matrix does to a basis', 'A change of basis, read as a statement about where the arrows go.'],
  ['14 Nov 2026', 'Motion in one frame and another', 'The same velocity, written in two coordinate systems, and why the Jacobian does it.'],
  ['02 Nov 2026', 'A proof that fits on a card', 'The two-line argument, then the three pages of work it hides.'],
];

export default {
  title: 'Components/Entry list',
  parameters: {
    docs: {
      description: {
        component:
          'Date, title, dek, on one line. The journal index and the home page both read this component; a topic row groups it.',
      },
    },
  },
  render: (args) => `<div class="wrap"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Default = {
  args: {
    note: 'The list: date in dust, title in rust, dek in starlight.',
    body: `<ul class="entry-list">${entries
      .map(([date, title, dek]) => `<li><a class="entry" href="#storybook-root"><span class="entry-date">${date}</span><span class="entry-title">${title}</span><span class="entry-dek"> — ${dek}</span></a></li>`)
      .join('')}</ul>`,
  },
};

export const WithoutDek = {
  args: {
    note: 'No dek: the title ends the line. An entry without a description front-matter field renders this.',
    body: `<ul class="entry-list">${entries
      .slice(0, 2)
      .map(([date, title]) => `<li><a class="entry" href="#storybook-root"><span class="entry-date">${date}</span><span class="entry-title">${title}</span></a></li>`)
      .join('')}</ul>`,
  },
};

export const GroupedByTopic = {
  args: {
    note: 'Grouped: /journal/ repeats the list under one topic heading, each heading a hairline rule.',
    body: ['Matrices', 'Kinematics']
      .map(
        (topic, i) =>
          `<section class="journal-topic"><h2>${topic}</h2><ul class="entry-list"><li><a class="entry" href="#storybook-root"><span class="entry-date">${entries[i][0]}</span><span class="entry-title">${entries[i][1]}</span><span class="entry-dek"> — ${entries[i][2]}</span></a></li></ul></section>`,
      )
      .join(''),
  },
};

export const Empty = {
  args: {
    note: 'Empty: the same list with nothing in it, which is the journal today. See the Empty state component for the block that replaces it.',
    body: '<ul class="entry-list"></ul>',
  },
};
