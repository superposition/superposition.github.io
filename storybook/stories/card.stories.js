const card = (title, text, meta, image) => `<li><a class="card" href="#storybook-root">
  ${image ? `<span class="card-media"><img src="${image}" alt="" width="600" height="375" loading="lazy"></span>` : ''}
  <span class="card-title">${title}</span>
  <span class="card-text">${text}</span>
  <span class="card-meta">${meta}</span>
</a></li>`;

export default {
  title: 'Components/Card',
  parameters: {
    usedOn: ['projects.md'],
    docs: {
      description: {
        component:
          'One card for the twenty repository pages on /projects/: photograph, name, tagline, the two facts a card carries. The frame is the HUD box — one hairline and two amber corner ticks — and hover changes the title and the hairline only. No shadow, no lift: the corner tick already says the block is a block. Measured: 46.5px of content box before the type, title --star 16.93:1, tagline --starlight 15.44:1, meta --dust 7.51:1.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p><ul class="repo-grid">${args.body}</ul></div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const WithPhotograph = {
  args: {
    note: 'The shipped card: Mage, with its own kernel-progression plate. This is the grid on /projects/.',
    body: card(
      'Mage',
      'GPU profiler TUI for Triton and CUDA kernels, with nsys and ncu integration',
      'Python · 6 stars',
      '/assets/repos/mage/kernel-progression-1200.webp',
    ),
  },
};

export const WithoutPhotograph = {
  args: {
    note: 'A repository with no figure of its own: the card keeps the same box and lets the type carry it. nanda-ts ships no image.',
    body: card(
      'nanda-ts',
      'A Bun-native TypeScript SDK for A2A agents, agent identity and the NANDA registry',
      'C · 0 stars',
    ),
  },
};

export const Grid = {
  args: {
    note: 'Four in the grid at 1200: 260px minimum, 24px gutters. Hover one and the title takes the accent while its hairline sweeps in.',
    body: [
      card('Space Bullet Hell', 'A WebGPU hall of bullets, written twice: once in Zig, once in TypeScript', 'Zig · 3 stars', '/assets/repos/space-bullet-hell/guardian-data-ring-1200.webp'),
      card('Qualia', 'A JEPA runtime whose promotion is gated on evidence, with crash-safe evidence logs', 'Rust · 4 stars'),
      card('Marigraph', 'Tide tables as a graph problem: 73 stations, 41 years, one harmonic fit', 'JavaScript · 2 stars', '/assets/repos/marigraph/cli-1346.webp'),
      card('Cairo Vault', 'A Starknet contract that keeps a per-caller deposit balance and a running total', 'Cairo · 0 stars'),
    ].join(''),
  },
};
