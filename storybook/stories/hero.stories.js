const topics = ['Data informatics', 'AI', 'Matrices', 'Kinematics', 'Cryptographic proofs'];

/* The backplate is the site's own map now — generated into _includes/scene/map.svg
   and redrawn in WebGL by assets/scene/map.js, neither of which a workbench story
   can render. What is here is what the page always has: the type layer, in the
   band the scene keeps clear for it. */
const hero = () => `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-inner wide">
    <h1 id="hero-title">Superposition</h1>
    <input class="visually-hidden crawl-switch" type="checkbox" id="crawl-hold">
    <div class="crawl">
      <p class="lede">Notes on mathematics, AI, and the systems behind them. Written out in full: the argument, the measurement, the working.</p>
    </div>
    <p class="crawl-hold"><label for="crawl-hold">Hold the statement</label></p>
    <ul class="topic-list" aria-label="Topics">
      ${topics.map((t) => `<li><a href="#storybook-root">${t}</a></li>`).join('\n      ')}
    </ul>
  </div>
</section>`;

export default {
  title: 'Components/Hero',
  parameters: {
    usedOn: ['index.html'],
    docs: {
      description: {
        component:
          'The home page s first viewport, full bleed at 88svh, type over the map of the site at the bottom. It is the only place the wordmark is at --step-hero (clamp 48 to 150px). The backplate is _includes/scene/map.html, which a story cannot render: the plate is generated and the canvas needs the page s import map. What is measured here is the type layer. Measured over the busiest frame of the map: headline --star 16.63:1 against the plate s 99th-percentile backdrop and 12.0:1 against the single brightest pixel behind it, lede --starlight 15.34:1, topic list 16.81:1. The scrubbed opening statement drifts 26px inside a frame whose edges fade.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Default = {
  args: { body: hero() },
};

export const ReducedMotion = {
  args: { body: hero() },
  parameters: {
    docs: {
      description: {
        story:
          'The photograph drifts over 24s and the statement over 52s. Under prefers-reduced-motion: reduce both stop, the crawl s mask and tilt are removed with them, and the Hold control is hidden because there is nothing to hold. This story is the same markup; the reader s own setting decides.',
      },
    },
  },
};
