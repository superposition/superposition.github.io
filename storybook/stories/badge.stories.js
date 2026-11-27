export default {
  title: 'Components/Badge',
  parameters: {
    docs: {
      description: {
        component:
          'A short label that is not a link: a language, a topic, a state. The edge is currentColor, so a badge can never be less legible than its own type.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p><div class="sg-row">${args.body}</div></div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Language = {
  args: {
    note: 'Language: the neutral badge, dust type and dust edge.',
    body: ['<span class="badge">Python</span>', '<span class="badge">Rust</span>', '<span class="badge">TypeScript</span>'].join(''),
  },
};

export const Topic = {
  args: {
    note: 'Topic: the amber accent.',
    body: ['<span class="badge badge-accent">Matrices</span>', '<span class="badge badge-accent">Kinematics</span>', '<span class="badge badge-accent">AI</span>'].join(''),
  },
};

export const State = {
  args: {
    note: 'State: the cyan, the site’s state colour. Use it for progress and status, never for emphasis.',
    body: ['<span class="badge badge-state">In progress</span>', '<span class="badge badge-state">Archived</span>'].join(''),
  },
};

export const Solid = {
  args: {
    note: 'Solid: raised surface, no edge, for a count or a fact that is not a category.',
    body: '<span class="badge badge-solid">6 stars</span>',
  },
};

export const WithDot = {
  args: {
    note: 'With a topic dot: the same five colours the topic row uses, for a compact topic label.',
    body: [
      '<span class="badge badge-accent"><span class="dot" aria-hidden="true"></span>Data informatics</span>',
      '<span class="badge badge-accent"><span class="dot" aria-hidden="true"></span>Matrices</span>',
      '<span class="badge badge-accent"><span class="dot dot-plum" aria-hidden="true"></span>Kinematics</span>',
    ].join(''),
  },
};
