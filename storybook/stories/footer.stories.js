const footer = `<footer class="site-footer wide">
  <div class="wrap">
    <p>Superposition · Notes on mathematics, AI, and the systems behind them</p>
    <p><a href="#storybook-root">RSS</a> <span aria-hidden="true">/</span> <a href="#storybook-root">GitHub</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Image credits</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Design system</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Series</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Now showing</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Say hello</a></p>
  </div>
</footer>`;

export default {
  title: 'Components/Footer',
  parameters: {
    usedOn: ['_layouts/default.html'],
    docs: {
      description: {
        component:
          'The credits and social row, on every page: the subtitle, then the seven ways out — including the Series and Now showing links the header hides below 640px, which is what keeps exactly one reachable copy of each at every width. --step-1 mono upper case in --dust (7.51:1), links in --starlight (15.44:1) with 4px of block padding so each is a 31.4px target, one hairline above. The separators are aria-hidden, so a screen reader hears seven links and no slashes.',
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
