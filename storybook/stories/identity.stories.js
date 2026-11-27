// The pieces the space-opera identity adds. Each story renders the markup a page
// renders; the identity itself comes from the workbench toolbar, which sets
// data-lab on <html>, because the identity's rules are scoped to that attribute.

import { expect } from 'storybook/test';

const decal = `<div class="wrap" style="padding: 24px 0;">
  <p><span class="decal">Repository</span> <span class="kicker">Rust · 41 stars</span></p>
  <p style="margin-top: 16px;"><span class="decal">Matrices</span> <span class="kicker">2026-11-20</span></p>
  <p class="kicker" style="margin-top: 16px;">A plain kicker, for comparison</p>
</div>`;

const gauge = `<div class="wrap" style="padding: 24px 0;">
  <h2 class="section-title">Repositories</h2>
  <p class="meta">One gauge cluster per section title: 3px bars on a 10px pitch over a hairline track.</p>
  <h2 class="section-title" style="margin-top: 40px;">Recent entries</h2>
  <p class="meta">It is a divider, so it groups content rather than identifying a control.</p>
</div>`;

const frame = `<div class="wrap" style="padding: 24px 0;">
  <figure class="figure">
    <img src="/assets/art/galaxy/sombrero-1200.webp" width="1200" height="1462" alt="The Sombrero Galaxy seen edge-on.">
    <figcaption>A figure carries the HUD frame: one hairline box and two corner ticks in --accent.</figcaption>
  </figure>
  <div class="callout">
    <span class="callout-title">A callout</span>
    The left edge is --state.
  </div>
</div>`;

const alert = `<div class="wrap" style="padding: 24px 0;">
  <p><span class="alert">Signal lost</span></p>
  <p class="meta" style="margin-top: 12px;">The only red on the site: 4.7:1 as an edge on the ground, 7.0:1 as type. It appears once, on the 404.</p>
</div>`;

const log = `<div class="wrap" style="padding: 24px 0;">
  <ul class="entry-list">
    <li><a class="entry" href="#storybook-root"><span class="entry-date"><time datetime="2026-11-20">2026-11-20</time></span><span class="entry-title">What a matrix does to a basis</span><span class="entry-dek">One line of description.</span></a></li>
    <li><a class="entry" href="#storybook-root"><span class="entry-date"><time datetime="2026-11-14">2026-11-14</time></span><span class="entry-title">Motion in one frame and another</span><span class="entry-dek">One line of description.</span></a></li>
  </ul>
</div>`;

const crawl = `<section class="hero" style="min-height: 60svh;">
  <img src="/assets/art/galaxy/carina-1600.webp" width="1920" height="1111" alt="The Cosmic Cliffs of the Carina Nebula.">
  <div class="starfield" aria-hidden="true"></div>
  <div class="hero-inner wide">
    <h1>Superposition</h1>
    <input class="visually-hidden crawl-switch" type="checkbox" id="crawl-hold">
    <div class="crawl">
      <p class="lede">Notes on mathematics, AI, and the systems behind them. Written out in full: the argument, the measurement, the working.</p>
    </div>
    <p class="crawl-hold"><label for="crawl-hold">Hold the statement</label></p>
    <ul class="topic-list" aria-label="Topics">
      <li>Data informatics</li><li>AI</li><li>Matrices</li><li>Kinematics</li><li>Cryptographic proofs</li>
    </ul>
  </div>
</section>`;

const hazard = `<div style="padding: 24px;">
  <div class="hazard" aria-hidden="true"></div>
  <p class="meta">The single hazard stripe on the site. It renders only under data-lab="a", and only on the home page.</p>
</div>`;

const doc = (text) => ({ docs: { description: { story: text } } });

export default {
  title: 'Components/Identity parts',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The pieces the space-opera identity adds: decal, gauge rail, HUD frame, alert, the log entry list, the crawl and the one hazard stripe. Switch the identity in the toolbar to see each in the identity it belongs to.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Decal = {
  args: { body: decal },
  // Pinned to the shipped identity so the assertion cannot depend on where the
  // toolbar happens to be. The two stories below pin the other two.
  globals: { identity: 'c' },
  parameters: doc('The eyebrow as a hardware chip: near-white on film, the one 3px radius on the site. In the poster identity it becomes a plain tracked label, because a poster has no hardware.'),
  play: async ({ canvasElement }) => {
    const chip = getComputedStyle(canvasElement.querySelector('.decal'));
    await expect(document.documentElement.getAttribute('data-lab')).toBe('c');
    await expect(chip.borderTopWidth).toBe('1px');
    await expect(chip.borderTopLeftRadius).toBe('3px');
    await expect(chip.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  },
};

// The toolbar's identity switch and the identity-specific rules under it. A
// play function cannot press a toolbar button from inside the preview, so these
// two pin the global the toolbar sets: if the decorator stops applying it, or
// the scoped rules stop reading it, both fail.
export const DecalInstrument = {
  name: 'Decal — instrument',
  globals: { identity: 'a' },
  args: { body: decal },
  parameters: doc('Identity a cuts the chip from condensed display type at 12px, tracked .06em: hardware, not a label.'),
  play: async ({ canvasElement }) => {
    const chip = getComputedStyle(canvasElement.querySelector('.decal'));
    await expect(document.documentElement.getAttribute('data-lab')).toBe('a');
    await expect(chip.fontFamily).toContain('Anton');
    await expect(chip.letterSpacing).toBe('0.72px');
  },
};

export const DecalPoster = {
  name: 'Decal — poster',
  globals: { identity: 'b' },
  args: { body: decal },
  parameters: doc('Identity b has no chip: the film and the hairline are gone, the radius is back to 0, and the eyebrow is a plain tracked label.'),
  play: async ({ canvasElement }) => {
    const chip = getComputedStyle(canvasElement.querySelector('.decal'));
    await expect(document.documentElement.getAttribute('data-lab')).toBe('b');
    await expect(chip.borderTopWidth).toBe('0px');
    await expect(chip.borderTopLeftRadius).toBe('0px');
    await expect(chip.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
};

export const GaugeRail = {
  args: { body: gauge },
  parameters: doc('One gauge cluster above a section title: 3px bars on a 10px pitch, 1.5px tall, over a hairline track. It is a divider, so it has no contrast floor; in the instrument identity it is amber at 12.3:1.'),
};

export const HudFrame = {
  args: { body: frame },
  parameters: doc('A readout rather than a border: one hairline box and two corner ticks in --accent, with the wide bloom on the ticks. The tick is measured at 12.3:1 on the ground so it clears the 3:1 edge minimum whatever the photograph behind it does.'),
};

export const Alert = {
  args: { body: alert },
  parameters: doc('The one red on the site. Red is 4.7:1 on the ground and 4.1:1 on a raised block, so it is an edge or text on the ground, and it appears exactly once: the 404.'),
};

export const LogEntry = {
  args: { body: log },
  parameters: doc('The entry list as log rows: an ISO stamp with tabular figures, a state mark drawn with a background rather than a glyph so no reader hears it, then the title. In the instrument identity the list takes a gauge rule down its side.'),
};

export const Crawl = {
  args: { body: crawl },
  parameters: doc('The home page statement on a crawl plane: centred, tracked, tipping four degrees in the poster identity, drifting 26px over 52 to 64 seconds inside a frame whose edges fade. The Hold switch is the pause control; prefers-reduced-motion removes the motion, the tilt and the fade.'),
};

export const Hazard = {
  args: { body: hazard },
  parameters: doc('One warning stripe, on the home page only, in the instrument identity only: it marks the edge of the opening and never repeats.'),
};
