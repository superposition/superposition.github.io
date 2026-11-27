const hero = `<section class="hero">
  <img src="/assets/art/galaxy/carina-1600.webp" srcset="/assets/art/galaxy/carina-1600.webp 1600w, /assets/art/galaxy/carina-1920.webp 1920w" sizes="100vw" width="1920" height="1111" alt="The Cosmic Cliffs of the Carina Nebula: clouds of rust and blue gas rising against black space.">
  <div class="hero-inner wide">
    <h1>Superposition</h1>
    <p class="lede">Notes on mathematics, AI, and the systems behind them. Written out in full: the argument, the measurement, the working.</p>
    <ul class="topic-list" aria-label="Topics">
      <li><span class="dot dot-accent" aria-hidden="true"></span><a href="#storybook-root">Data informatics</a></li>
      <li><span class="dot dot-nebula" aria-hidden="true"></span><a href="#storybook-root">AI</a></li>
      <li><span class="dot dot-state" aria-hidden="true"></span><a href="#storybook-root">Matrices</a></li>
      <li><span class="dot dot-plum" aria-hidden="true"></span><a href="#storybook-root">Kinematics</a></li>
      <li><span class="dot dot-dust" aria-hidden="true"></span><a href="#storybook-root">Cryptographic proofs</a></li>
    </ul>
  </div>
</section>`;

export default {
  title: 'Components/Hero',
  parameters: {
    docs: {
      description: {
        component:
          'The home page’s first viewport: one photograph, full bleed, type over it at the bottom. It is the only place the wordmark is at --step-hero and the only thing on the site that moves.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const FullBleed = {
  args: { body: hero },
};

export const ReducedMotion = {
  args: { body: hero },
  parameters: {
    docs: {
      description: {
        story:
          'The photograph drifts from scale 1 to 1.06 over 24s, alternating. Under prefers-reduced-motion: reduce the animation is removed entirely — this story is the same markup with the reader’s own setting deciding.',
      },
    },
  },
};
