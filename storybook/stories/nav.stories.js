const nav = `<header class="site-header wide">
  <a class="home-link" href="#storybook-root">Superposition</a>
  <nav aria-label="Main navigation">
    <a href="#storybook-root" aria-current="page">Repositories</a>
    <a href="#storybook-root">Journal</a>
    <a class="nav-series" href="#storybook-root">Series</a>
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
          'The site header: wordmark and links, one line at every width from 360 up. Five links from 640px; below that Series drops to the footer, so a phone carries four. It wraps rather than collapsing, so there is no menu button and no script.',
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
    note: 'On a phone the header is one line and every link carries 5px of padding so its target is 25px or more: four links at 12px and 59px tall down to 420, then 10.5px with tighter gaps and 57px below that. Series is in the footer at both.',
    body: nav,
  },
  globals: { viewport: { value: 'mobile1' } },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};
