import { expect } from 'storybook/test';

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
          'The site header, on every page: wordmark and six links, one row at every width from 360 up. From 640px all six show; below that Series and Now showing drop to the footer, so a phone carries four — one reachable link each, never two, because a hidden link also leaves the tab order. It wraps rather than collapsing, so there is no menu button and no script. Measured: every link carries 4px of block padding, so the smallest target on the site is 24.8px at 10.5px type; the header is one row at 53px/360, 55px/420, 57px/1440, and at exactly 420 the wordmark and four links needed 397px against a 388px row before the tracking came off.',
      },
    },
  },
  render: (args) => withNote(args.note, args.body),
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Desktop = {
  args: {
    note: 'At 1440: all six links, the current page in amber with its glow, links at 29px targets. Hover one, then tab through them — hover takes the accent, focus takes the 2px --state ring.',
    body: nav,
  },
};

export const Narrow = {
  args: {
    note: 'The same markup at 375: Series and Now showing are display:none and move to the footer, the header drops to --step-header (10.5px), and it stays one row.',
    body: nav,
  },
  globals: { viewport: { value: 'phone-375' } },
  parameters: { viewport: { defaultViewport: 'phone-375' } },
  // Below 420 the header drops a step of type rather than stacking, and it has
  // no menu button to fall back on: those two facts are the whole reason the
  // nav is allowed to ship without a script.
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector('.site-header');
    await expect(getComputedStyle(header).fontSize).toBe('10.5px');
    // Series and Now showing are in the footer at this width, not in the header.
    await expect(canvasElement.querySelector('.nav-series')).not.toBeVisible();
    await expect(canvasElement.querySelector('.nav-showing')).not.toBeVisible();
    // One line: every link that is drawn shares a top edge. A header that
    // stacked instead would need the menu button the site does not have.
    const drawn = [...header.querySelectorAll('nav a')].filter((a) => a.getBoundingClientRect().width > 0);
    await expect(new Set(drawn.map((a) => Math.round(a.getBoundingClientRect().top))).size).toBe(1);
    // Every drawn link is a 24px target or better.
    for (const a of drawn) await expect(a.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await expect(header.querySelector('button')).toBeNull();
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
