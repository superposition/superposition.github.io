// The pieces the space-opera identity adds. Each story renders the markup a page
// renders; the identity itself comes from the workbench toolbar, which sets
// data-lab on <html>, because the identity's rules are scoped to that attribute.

const decal = `<div class="wrap" style="padding: 24px 0;">
  <p><span class="decal">Repository</span> <span class="kicker">Rust · 1 star</span></p>
  <p style="margin-top: 16px;"><span class="decal">Matrices</span> <span class="kicker">2026-11-20</span></p>
  <p class="kicker" style="margin-top: 16px;">A plain kicker, for comparison</p>
</div>`;

const gauge = `<div class="wrap" style="padding: 24px 0;">
  <h2 class="section-title">Repositories</h2>
  <p class="meta">One gauge cluster per section title: 4px bars on a 12px pitch over a hairline track.</p>
  <h2 class="section-title" style="margin-top: 40px;">Recent entries</h2>
  <p class="meta">It is a divider, so it groups content rather than identifying a control, and it has no contrast floor.</p>
</div>`;

const frame = `<div class="wrap" style="padding: 24px 0;">
  <figure class="figure">
    <img src="/assets/art/galaxy/sombrero-1200.webp" width="1200" height="1462" alt="The Sombrero Galaxy seen edge-on, a bright core inside a dark dust lane.">
    <figcaption>A figure carries the HUD frame: one hairline box and two corner ticks in --accent, 13.07:1 on the ground.</figcaption>
  </figure>
  <aside class="notice">
    <p class="notice-title">The notice, on the same HUD system</p>
    <p class="notice-text">Its left edge is --state at 10.62:1 on the raised block. The figure above has the corner ticks; the notice does not, because an edge plus two ticks would be two ways of saying the same thing.</p>
  </aside>
</div>`;

const alert = `<div class="wrap" style="padding: 24px 0;">
  <p><span class="alert">Signal lost</span></p>
  <p class="meta" style="margin-top: 12px;">The only red on the site: 5.01:1 as an edge on the ground, 7.46:1 as type. It appears once, on the 404, and once more when a photograph fails to load.</p>
</div>`;

const log = `<div class="wrap" style="padding: 24px 0;">
  <ul class="entry-list">
    <li><a class="entry" href="#storybook-root"><span class="entry-date"><time datetime="2026-11-20">2026-11-20</time></span><span class="entry-title">Example — what a matrix does to a basis</span><span class="entry-dek">A change of basis, read as a statement about where the arrows go.</span></a></li>
    <li><a class="entry" href="#storybook-root"><span class="entry-date"><time datetime="2026-11-21">2026-11-21</time></span><span class="entry-title">Example — motion in one frame and another</span><span class="entry-dek">Position is easy to write and hard to mean.</span></a></li>
  </ul>
</div>`;

const crawl = `<section class="hero" style="min-height: 60svh;">
  <span class="skeleton skeleton-hero" aria-hidden="true"><span class="skeleton-label">Loading the Carina Nebula</span></span>
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
      <li><a href="#storybook-root">Data informatics</a></li><li><a href="#storybook-root">AI</a></li><li><a href="#storybook-root">Matrices</a></li><li><a href="#storybook-root">Kinematics</a></li><li><a href="#storybook-root">Cryptographic proofs</a></li>
    </ul>
  </div>
</section>`;

const doc = (text) => ({ docs: { description: { story: text } } });

export default {
  title: 'Components/Identity parts',
  parameters: {
    usedOn: ['style.md'],
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The pieces the space-opera identity adds: the chip, the gauge rail, the HUD frame, the notice, the alert, the log entry list and the crawl. /style/ renders every one of them; switch the identity in the toolbar to see each in the identity it belongs to. The three identities are one attribute on <html> — data-lab="c" shipped, "a" instrument, "b" poster — and no page sets it, so this is where they can be compared.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Decal = {
  args: { body: decal },
  parameters: doc('The chip: 12px mono 600 on a warm charcoal film with a hairline edge and the one 3px radius on the site. --chip-text on --chip-bg is 10.55:1 measured; the film itself is 1.60:1 against the ground, which is right for a label that is not a control. Under the poster identity the film goes and the chip becomes a plain tracked label.'),
};

export const GaugeRail = {
  args: { body: gauge },
  parameters: doc('4px bars on a 12px pitch in --accent over a hairline track, above the section title. In the poster identity the rail is the hairline itself. It is a divider and has no floor; the bars are 13.07:1 anyway.'),
};

export const HudFrame = {
  args: { body: frame },
  parameters: doc('The HUD frame: one hairline box and two 16px corner ticks in --accent — a readout, not a border. The notice below it is the state edge instead, because a block with both would say the same thing twice.'),
};

export const Alert = {
  args: { body: alert },
  parameters: doc('The one red: --alert edge at 5.01:1, --alert-text type at 7.46:1. Once on the site, on /404.html, and in the skeleton’s error state.'),
};

export const LogEntries = {
  args: { body: log },
  parameters: doc('The same entry rows read as a log under the instrument identity: a gauge rule down the side, the stamp in --accent-warm, the title in mono. The rows are one component; the identity changes the face, not the markup.'),
};

export const Crawl = {
  args: { body: crawl },
  parameters: doc('The opening statement on its crawl plane, with the Hold control beneath it. Under the poster identity the plane tips 4 degrees. Under reduced motion the drift, the tilt, the mask and the control all go.'),
};
