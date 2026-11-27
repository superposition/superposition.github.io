export default {
  title: 'Components/Link',
  parameters: {
    usedOn: ['_layouts/default.html', 'index.html'],
    docs: {
      description: {
        component:
          'Navigation and reference. Three kinds and no more: the bare link (body copy, --accent-text at 13.07:1), the command link (.text-link: an underline drawn as a border, so it thickens on hover without moving the line), and the prose link (--nebula-text at 6.69:1, so a citation inside an article does not read as chrome). The focus ring is --state at 12.93:1 with a 2px ring and 4px offset.',
      },
    },
  },
  render: (args) => `<div class="wrap"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Command = {
  args: {
    note: 'Command link: the footer row, "All repositories", the way out of a page. 31.4px tall at 13px/1.8 with 4px of block padding, over the 24px target minimum.',
    body: '<p class="kicker"><a class="text-link" href="#storybook-root">All repositories</a> <span aria-hidden="true">/</span> <a class="text-link" href="#storybook-root">All entries</a> <span aria-hidden="true">/</span> <a class="text-link" href="#storybook-root">RSS</a></p>',
  },
};

export const Prose = {
  args: {
    note: 'Prose link: nebula, underline at rest. Only ever inside .prose, where a citation lives.',
    body: '<div class="prose"><p>The conversion is in <a href="#storybook-root">the Lumenera white paper</a>, table 3, and the numbers here are its numbers.</p></div>',
  },
};

export const Inline = {
  args: {
    note: 'The bare link, inside a sentence. It inherits the underline thickness step on hover and nothing else moves.',
    body: '<p>A sentence with <a href="#storybook-root">a reference in it</a>, which is how an entry cites a source.</p>',
  },
};

export const States = {
  args: {
    note: 'Tab through the row: every link takes the same 2px --state ring at a 4px offset, and the ring is the only thing that changes.',
    body: '<p><a class="text-link" href="#storybook-root">A command</a> · <a class="text-link" href="#storybook-root">Another command</a></p><div class="prose"><p>A paragraph with <a href="#storybook-root">a bare link in it</a>.</p></div>',
  },
};
