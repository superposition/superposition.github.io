const topics = ['Data informatics', 'AI', 'Matrices', 'Kinematics', 'Cryptographic proofs'];

const hero = (withSkeleton) => `<section class="hero" aria-labelledby="hero-title">
  ${withSkeleton ? '<span class="skeleton skeleton-hero" aria-hidden="true"><span class="skeleton-label">Loading the Carina Nebula</span></span>' : ''}
  <img src="/assets/art/galaxy/carina-1600.webp" srcset="/assets/art/galaxy/carina-1600.webp 1600w, /assets/art/galaxy/carina-1920.webp 1920w" sizes="100vw" width="1920" height="1111" alt="The Cosmic Cliffs of the Carina Nebula: clouds of rust and blue gas rising against black space.">
  <div class="starfield" aria-hidden="true"></div>
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
          'The home page s first viewport: one photograph, full bleed at 88svh, type over it at the bottom. It is the only place the wordmark is at --step-hero (clamp 48 to 150px) and the only thing on the site that moves: the photograph drifts from scale 1 to 1.06 over 24s, and the opening statement drifts 26px inside a frame whose edges fade. The skeleton sits behind the photograph and is covered when it paints. Measured: hero type --star 16.93:1 over the scrim, lede --starlight 15.44:1, the scrim reaches --void at the bottom edge so the copy never sits on the photograph s bright gas.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Default = {
  args: { body: hero(true) },
};

export const WithoutSkeleton = {
  args: { body: hero(false) },
  parameters: {
    docs: {
      description: {
        story:
          'The same hero with no skeleton element. Identical once the photograph has painted — which is the point of putting it behind the image rather than above it.',
      },
    },
  },
};

export const ReducedMotion = {
  args: { body: hero(true) },
  parameters: {
    docs: {
      description: {
        story:
          'The photograph drifts over 24s and the statement over 52s. Under prefers-reduced-motion: reduce both stop, the crawl s mask and tilt are removed with them, and the Hold control is hidden because there is nothing to hold. This story is the same markup; the reader s own setting decides.',
      },
    },
  },
};
