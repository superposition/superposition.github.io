export default {
  title: 'Components/Range control',
  parameters: {
    usedOn: ['journal.html'],
    docs: {
      description: {
        component:
          'A row of ranges over one long list, each with the number of items in it: the journal s topics, and anything else that grows past a screen. It is pagination without a second page — the site is static, so the whole journal is one document and a range is an anchor into it. An anchor has no disabled state, because a range that is not there is not rendered at all; a topic with no published entries does not appear. Measured: rest --dust 7.51:1, hover --star 16.93:1, current --accent-text 13.07:1 with a 6px --accent mark, target 28.8px tall.',
      },
    },
  },
  render: (args) => `<div class="wrap"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

const range = (items) => `<nav class="range" aria-label="Journal by topic">
  <span class="kicker">Topics</span>
  <ul class="range-list">${items
    .map(([name, count, current]) => `<li><a class="range-link" href="#storybook-root"${current ? ' aria-current="true"' : ''}>${name} <span class="range-count">${count}</span></a></li>`)
    .join('')}</ul>
</nav>`;

export const Journal = {
  args: {
    note: 'The five topics the journal groups by, with the counts a --drafts build produces (3 entries across 3 topics; the two the site has no writing for yet are not shown).',
    body: range([['Matrices', 1], ['Kinematics', 1], ['Music', 1]]),
  },
};

export const WithCurrent = {
  args: {
    note: 'The range the reader is in gets aria-current and the amber mark. On a static page that is the anchor they arrived by; the story sets it so the state can be seen.',
    body: range([['Matrices', 1], ['Kinematics', 1, true], ['Music', 1]]),
  },
};

export const OneRange = {
  args: {
    note: 'One range is still a range: the count is the information. It is never hidden for being short.',
    body: range([['Matrices', 1]]),
  },
};
