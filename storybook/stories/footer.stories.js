const footer = `<footer class="site-footer wide">
  <div class="wrap">
    <p>Superposition · Notes on mathematics, AI, and the systems behind them</p>
    <p><button class="soundtrack-toggle" type="button" aria-pressed="false" aria-label="Play the soundtrack"><svg class="soundtrack-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path class="soundtrack-play" d="M1 0.5 11 6 1 11.5Z"/><path class="soundtrack-pause" d="M1 0.5h3.2v11H1Zm6.8 0H11v11H7.8Z"/></svg>Soundtrack</button> <span aria-hidden="true">/</span> <a href="#storybook-root">RSS</a> <span aria-hidden="true">/</span> <a href="#storybook-root">GitHub</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Credits</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Design system</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Series</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Now showing</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Say hello</a></p>
  </div>
</footer>`;

export default {
  title: 'Components/Footer',
  parameters: {
    usedOn: ['_layouts/default.html'],
    docs: {
      description: {
        component:
          'The credits and social row, on every page: the subtitle, then the soundtrack control and the seven ways out — including the Series and Now showing links the header hides below 640px, which is what keeps exactly one reachable copy of each at every width. The soundtrack is a button in that row, 44px square where the links are 31.4px targets; it is documented on its own page and shown here in place. --step-1 mono upper case in --dust (7.51:1), links in --starlight (15.44:1) with 4px of block padding, one hairline above. The separators are aria-hidden, so a screen reader hears the control and seven links, and no slashes.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Default = {
  args: { body: footer },
};

export const Focused = {
  args: { body: footer },
  parameters: {
    docs: {
      description: {
        story:
          'Tab into the row: each link takes the 2px --state ring at a 4px offset, measured at 12.93:1 on the ground.',
      },
    },
  },
};
