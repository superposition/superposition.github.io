const footer = `<footer class="site-footer wide">
  <div class="wrap">
    <p>Superposition · Data informatics, AI, matrices, kinematics, cryptographic proofs</p>
    <p><a href="#storybook-root">RSS</a> <span aria-hidden="true">/</span> <a href="#storybook-root">GitHub</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Image credits</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Design system</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Say hello</a></p>
  </div>
</footer>`;

export default {
  title: 'Components/Footer',
  parameters: {
    docs: {
      description: {
        component:
          'The credits and social row, on every page: the subtitle, then the five ways out. 13px mono upper case in dust, links in starlight, one hairline above.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Default = {
  args: { body: footer },
};

export const InPlace = {
  args: {
    body: `<div class="wrap"><p class="kicker">A page’s last line</p><p>Content ends here, the footer’s own margin-top is --space-6, and the hairline is the only rule.</p></div>${footer}`,
  },
};
