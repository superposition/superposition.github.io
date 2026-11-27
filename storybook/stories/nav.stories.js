const nav = `<header class="site-header wide">
  <a class="home-link" href="#storybook-root">Superposition</a>
  <nav aria-label="Main navigation">
    <a href="#storybook-root" aria-current="page">Repositories</a>
    <a class="nav-showing" href="#storybook-root">Now showing</a>
    <a href="#storybook-root">Journal</a>
    <a class="nav-series" href="#storybook-root">Series</a>
    <a href="#storybook-root">Topics</a>
    <a href="#storybook-root">About</a>
  </nav>
</header>`;

const withNote = (note, body) => `<div class="wide"><p class="kicker">${note}</p></div>${body}`;

export default {
  title: 'Components/Nav',
  parameters: {
    usedOn: ['_layouts/default.html'],
    docs: {
      description: {
        component:
          'The site header, on every page: wordmark and six links, one row at every width from 360 up. From 640px all six show; below that Series and Now showing drop to the footer, so a phone carries four — one reachable link each, never two, because a hidden link also leaves the tab order. It wraps rather than collapsing, so there is no menu button and no script. Measured: every link carries 4px of block padding, so the smallest target on the site is 24.8px at 10.5px type; at 360 the header is one row at --step-header, because the wordmark and four links need 373px and a 360 viewport has 324.',
      },
    },
  },
  render: (args) => withNote(args.note, args.body),
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Desktop = {
  args: {
    note: 'At 1440: all six links, the current page in amber with its glow, links at 28.8px targets. Hover one, then tab through them — hover takes the accent, focus takes the 2px --state ring.',
    body: nav,
  },
};

export const Narrow = {
  args: {
    note: 'The same markup at 360: the two section links are display:none, the header drops to --step-header, and it stays one row. Resize the iframe to see it; the rule is a media query, not a story.',
    body: nav,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const CurrentPage = {
  args: {
    note: 'The current page: aria-current="page" in amber with the text glow. /projects/ and every repository page carry it on Repositories; /journal/ on Journal, and so on.',
    body: `<header class="site-header wide">
  <a class="home-link" href="#storybook-root">Superposition</a>
  <nav aria-label="Main navigation">
    <a href="#storybook-root">Repositories</a>
    <a class="nav-showing" href="#storybook-root">Now showing</a>
    <a href="#storybook-root" aria-current="page">Journal</a>
    <a class="nav-series" href="#storybook-root">Series</a>
    <a href="#storybook-root">Topics</a>
    <a href="#storybook-root">About</a>
  </nav>
</header>`,
  },
};
