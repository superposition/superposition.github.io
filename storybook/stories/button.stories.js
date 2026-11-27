const shell = (inner) => `<div class="wide">${inner}</div>`;

export default {
  title: 'Components/Button',
  parameters: {
    docs: {
      description: {
        component:
          'An action. For navigation between pages use a link; for an action that reads inside a sentence use the text variant.',
      },
    },
  },
  render: (args) => shell(`<p class="kicker">${args.note}</p><div class="sg-row">${args.body}</div>`),
  argTypes: {
    note: { control: false },
    body: { control: false },
  },
};

export const Primary = {
  args: {
    note: 'Primary: one per view. The --rust-text fill, void type at 5.55:1; hover puts a cream edge on it.',
    body: '<a class="btn btn-primary" href="#storybook-root">Read the journal</a>',
  },
};

export const Secondary = {
  args: {
    note: 'Secondary: the alternative when two actions sit together.',
    body: '<a class="btn btn-secondary" href="#storybook-root">All repositories</a>',
  },
};

export const Ghost = {
  args: {
    note: 'Ghost: rows and chrome, where a filled box would be too loud.',
    body: '<a class="btn btn-ghost" href="#storybook-root">Skip</a>',
  },
};

export const Text = {
  args: {
    note: 'Text: an action that reads as a link, for use inside a sentence or a line of prose.',
    body: '<button class="btn btn-text" type="button">Copy the citation</button>',
  },
};

export const Sizes = {
  args: {
    note: 'Three sizes. Small for dense rows, large for the one action on a page.',
    body: [
      '<a class="btn btn-primary btn-sm" href="#storybook-root">Small</a>',
      '<a class="btn btn-primary" href="#storybook-root">Default</a>',
      '<a class="btn btn-primary btn-lg" href="#storybook-root">Large</a>',
    ].join(''),
  },
};

export const Disabled = {
  args: {
    note: 'Disabled is dust type inside a dashed dust edge. It never drops below the text minimum.',
    body: [
      '<button class="btn btn-primary" type="button" disabled>Primary</button>',
      '<button class="btn btn-secondary" type="button" disabled>Secondary</button>',
      '<button class="btn btn-ghost" type="button" disabled>Ghost</button>',
      '<a class="btn btn-primary" aria-disabled="true" role="button" tabindex="-1">Link button</a>',
    ].join(''),
  },
};

export const States = {
  args: {
    note: 'Hover it, tab to it, hold it down: the hover, focus-visible and active states are the live ones — no staged classes.',
    body: '<a class="btn btn-primary" href="#storybook-root">Primary, all states</a><a class="btn btn-secondary" href="#storybook-root">Secondary, all states</a>',
  },
};

export const Block = {
  args: {
    note: 'Block: full width of its container, for a single action in a narrow column.',
    body: '<a class="btn btn-primary btn-block" href="#storybook-root">Subscribe by RSS</a>',
  },
};
