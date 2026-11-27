const nav = `<header class="site-header wide">
  <a class="home-link" href="#storybook-root">Superposition</a>
  <nav aria-label="Main navigation">
    <a href="#storybook-root" aria-current="page">Repositories</a>
    <a href="#storybook-root">Journal</a>
    <a href="#storybook-root">Topics</a>
    <a href="#storybook-root">About</a>
  </nav>
</header>`;

const withNote = (note, body) =>
  `<div class="wide"><p class="kicker">${note}</p></div>${body}`;

export default {
  title: 'Components/Nav',
  parameters: {
    docs: {
      description: {
        component:
          'The site header: wordmark, four links, one line. It wraps rather than collapsing, so there is no menu button and no script.',
      },
    },
  },
  render: (args) => withNote(args.note, args.body),
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Desktop = {
  args: {
    note: 'At any width above 700px: wordmark left, links right, 13px mono upper case.',
    body: nav,
  },
};

export const CurrentPage = {
  args: {
    note: 'The current page is amber with the text bloom; hover is amber too, so the marker is colour and never a new weight.',
    body: nav,
  },
};

export const Narrow = {
  args: {
    note: 'At 420 the header is still one line, at 12px; at 390 and below the links wrap onto a second line.',
    body: nav,
  },
  globals: { viewport: { value: 'mobile1' } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
