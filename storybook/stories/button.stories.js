const shell = (inner) => `<div class="wrap">${inner}</div>`;

export default {
  title: 'Components/Button',
  parameters: {
    usedOn: ['404.html'],
    docs: {
      description: {
        component:
          'The action. Exactly one per page, and only where there is something to do: /404.html carries the only one on the site, "Back to the front page". A link between pages is a link, not a button. One variant, because a second button beside the first means one of them is not the action. Measured: fill --accent carrying --void type at 13.07:1, hover --accent-peak at 15.37:1, focus ring --state at 12.93:1, disabled --dust at 7.51:1, box 39.6px tall — over the 24px target minimum with room.',
      },
    },
  },
  render: (args) => shell(`<p class="kicker">${args.note}</p><p>${args.body}</p>`),
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Default = {
  args: {
    note: 'The one action. Hover it, tab to it, hold it down: these are the live states, not staged classes.',
    body: '<a class="btn btn-primary" href="#storybook-root">Back to the front page</a>',
  },
};

export const InSentence = {
  args: {
    note: 'A second, quieter way out of the same page. It is a command link, not a second button.',
    body:
      '<a class="btn btn-primary" href="#storybook-root">Back to the front page</a> ' +
      '<a class="text-link" href="#storybook-root">Or read the journal</a>',
  },
};

export const Disabled = {
  args: {
    note: 'Disabled is --dust type inside a dashed --dust edge: 7.51:1, so an unavailable action is still readable. No fill is left to mistake for an available one.',
    body: '<button class="btn btn-primary" type="button" disabled>Back to the front page</button>',
  },
};

export const AsAButton = {
  args: {
    note: 'The same component on a <button> element, for an action that does not navigate. A real button gets a real type attribute.',
    body: '<button class="btn btn-primary" type="button">Copy the citation</button>',
  },
};
