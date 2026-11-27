export default {
  title: 'Components/Link',
  parameters: {
    docs: {
      description: {
        component:
          'Navigation. The chrome link carries an underline at rest; a prose link takes the nebula colour so a link inside an article reads as a different thing from a link in the chrome.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Chrome = {
  args: {
    note: 'Chrome link: nav, footer rows, "all entries". Rust accent, underline drawn as a border so it sits closer to the type.',
    body: '<p class="kicker"><a class="text-link" href="#storybook-root">All entries</a> <span aria-hidden="true">/</span> <a class="text-link" href="#storybook-root">All repositories</a></p>',
  },
};

export const Prose = {
  args: {
    note: 'Prose link: nebula, plain underline. Only ever inside .prose.',
    body: '<div class="prose"><p>A paragraph with <a href="#storybook-root">a link in the prose colour</a> and a second <a href="#storybook-root">one</a>, which is how an article cites.</p></div>',
  },
};

export const Default = {
  args: {
    note: 'The bare link: rust, underlined, 1px. Used outside a component when nothing else fits.',
    body: '<p><a href="#storybook-root">A default link</a></p>',
  },
};
