export default {
  title: 'Components/Card',
  parameters: {
    docs: {
      description: {
        component:
          'One card, two uses: a repository with a thumbnail, and a journal entry without one. The hairline is the top edge; hover changes the title and nothing else.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p><ul class="repo-grid">${args.body}</ul></div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Repository = {
  args: {
    note: 'Repository card: thumbnail, title, tagline, meta. This is /projects/.',
    body: [
      '<li><a class="card" href="#storybook-root">',
      '<span class="card-media"><img src="/assets/repos/mage/kernel-progression-1200.webp" alt="" width="600" height="375" loading="lazy"></span>',
      '<span class="card-title">Mage</span>',
      '<span class="card-text">GPU profiler TUI for Triton and CUDA kernels, with nsys and ncu integration</span>',
      '<span class="card-meta">Python · 6 stars</span>',
      '</a></li>',
    ].join(''),
  },
};

export const RepositoryWithoutThumbnail = {
  args: {
    note: 'The same card with no image: the title moves up to the rule and the card still lines up in the grid.',
    body: [
      '<li><a class="card" href="#storybook-root">',
      '<span class="card-title">1BRC in C++</span>',
      '<span class="card-text">Six C++ parsers for the One Billion Row Challenge, one optimization per version</span>',
      '<span class="card-meta">C++</span>',
      '</a></li>',
    ].join(''),
  },
};

export const Entry = {
  args: {
    note: 'Entry card: kicker instead of a thumbnail, title, dek, topic badge. For a journal grid; the journal index today uses the entry list instead.',
    body: [
      '<li><a class="card entry-card" href="#storybook-root">',
      '<span class="card-kicker">Matrices · 20 Nov 2026</span>',
      '<span class="card-title">What a matrix does to a basis</span>',
      '<span class="card-text">A change of basis is a matrix read as a statement about where the arrows go.</span>',
      '<span class="card-foot"><span class="badge badge-accent">Matrices</span></span>',
      '</a></li>',
    ].join(''),
  },
};

export const Grid = {
  args: {
    note: 'Cards in the grid: auto-fill at 260px, so the row count follows the width without a breakpoint.',
    body: [
      ['Mage', 'GPU profiler TUI for Triton and CUDA kernels, with nsys and ncu integration', 'Python · 6 stars', '/assets/repos/mage/kernel-progression-1200.webp'],
      ['Qualia', 'A local-first console for dataset review, with the prompt history kept', 'Python · 4 stars', '/assets/repos/qualia/console-brain-panel-1280.webp'],
      ['Divulge', 'Explain a model’s decision in one screen, with the evidence beside it', 'TypeScript · 2 stars', '/assets/repos/divulge/first-screen-windows-1200.webp'],
    ]
      .map(
        ([title, text, meta, image]) =>
          `<li><a class="card" href="#storybook-root"><span class="card-media"><img src="${image}" alt="" width="600" height="375" loading="lazy"></span><span class="card-title">${title}</span><span class="card-text">${text}</span><span class="card-meta">${meta}</span></a></li>`,
      )
      .join(''),
  },
};
