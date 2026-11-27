/* The poster, which is the campaign system: a 2:3 one-sheet with key art from a
   repository's own figure, a plotted field when there is no figure, or no art at
   all. The markup here mirrors _includes/campaign/poster.html; the styles live in
   assets/notebook.css with every other component, so the site and the workbench
   cannot disagree about what a poster is.

   The four stories that matter are the four states the component ships in: with a
   still, without one, with no art at all, and reprinted small — where a container
   query drops the logline and then the credits rather than setting type below the
   floor. */

const campaign = {
  title: 'Mage',
  film: 'Inside the kernel, or around it',
  genre: 'Technical thriller',
  runtime: '1h 32m',
  logline: 'A terminal GPU profiler that makes the clock visible: inside the kernel, or around the call.',
  cast: ['the profiler', 'the kernel', 'the wall clock'],
  still: '/assets/repos/mage/kernel-progression-1200.webp',
};

const poster = ({ variant = 'still', c = campaign, number = '02 of 20', width = null, long = false }) => {
  const art =
    variant === 'text'
      ? ''
      : `<span class="poster-art">${
          variant === 'still'
            ? `<img src="${c.still}" alt="" width="1200" height="750" loading="lazy" decoding="async">`
            : ''
        }<span class="poster-no">${number}</span></span>`;
  return `<article class="poster poster--${variant}${long ? ' poster--long' : ''}"${width ? ` style="width:${width}"` : ''}>
  <a class="poster-link" href="#storybook-root">
    ${art}
    <span class="poster-body">
      <span class="poster-genre">${c.genre}</span>
      <span class="poster-title">${c.title}</span>
      <span class="poster-film">${c.film}</span>
      <span class="poster-logline">${c.logline}</span>
      <span class="poster-cast"><span class="poster-cast-label">Starring</span>${c.cast
        .map((role) => `<span class="poster-credit">${role}</span>`)
        .join('')}</span>
      <span class="poster-slate"><span class="poster-now">In libraries now</span><span class="poster-run">${c.runtime}</span></span>
    </span>
  </a>
</article>`;
};

export default {
  title: 'Components/Poster',
  parameters: {
    usedOn: ['now-showing.html', '_includes/campaign/poster.html'],
    docs: {
      description: {
        component:
          'A library advertised as a film. 2:3, key art at the top, type below it on the void ground so every word sits on a measured background. Text carries less as the poster is reprinted smaller: a container query drops the logline at 260px and the credits at 340px.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const WithStill = {
  args: {
    note: 'With a still: the repository’s own figure is the key art. Everything below the art sits on --void, so the poster’s contrast does not depend on what the photograph happens to be.',
    body: `<div style="max-width:360px">${poster({})}</div>`,
  },
};

export const WithoutStill = {
  args: {
    note: 'Without a still: the plotted field. A ring, a warm core and a ruled grid, drawn in gradients, for a repository whose page has no figure to print.',
    body: `<div style="max-width:360px">${poster({
      variant: 'field',
      c: {
        title: 'Cairo Vault',
        film: 'A deposit, and the total',
        genre: 'Chamber piece',
        runtime: '0h 41m',
        logline: 'A Starknet contract of about a hundred lines: one deposit per caller, and the running total.',
        cast: ['the caller', 'the balance', 'the running total'],
      },
      number: '19 of 20',
    })}</div>`,
  },
};

export const TextOnly = {
  args: {
    note: 'Text only: no art at all. The frame is type, and the cast credit is the card. This is what a campaign ships as before any still is licensed.',
    body: `<div style="max-width:360px">${poster({
      variant: 'text',
      c: {
        title: 'Marigraph',
        film: 'The shape of the risk',
        genre: 'Thriller',
        runtime: '1h 09m',
        logline: 'A volatility surface drawn in block characters, with the SVI fit and the arbitrage check beside it.',
        cast: ['the surface', 'the SVI fit', 'the arbitrage check'],
      },
    })}</div>`,
  },
};

export const LongTitle = {
  args: {
    note: 'A long title drops to its own step (poster--long) instead of breaking the name across three lines at the same size.',
    body: `<div style="max-width:360px">${poster({
      c: {
        title: 'ML-KEM / ML-DSA Lab',
        still: '/assets/art/galaxy/barred-1600.webp',
        film: 'From first principles',
        genre: 'Primer',
        runtime: '1h 56m',
        logline: 'The NIST lattice standards derived from first principles in C++20 and Rust, with the derivation notes.',
        cast: ['the lattice', 'the keygen', 'the test vector'],
      },
      long: true,
    })}</div>`,
  },
};

export const Reprinted = {
  args: {
    note: 'Reprinted small: the same component at the width the home strip uses. The logline and the credits are gone, the title steps down, and the type area takes a larger share of the frame — a poster carries less the smaller it is printed.',
    body: `<div style="display:flex;gap:20px;align-items:flex-start">${poster({ width: '212px' })}${poster({
      width: '160px',
      c: { ...campaign, title: 'Qualia', film: 'Twenty crates, one agent' },
    })}</div>`,
  },
};

export const Pair = {
  args: {
    note: 'Two side by side at the width the /now-showing/ index gives them: 2:3 held, the same type steps, no crop of the frame.',
    body: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px">${poster({})}${poster(
      {
        variant: 'field',
        c: {
          title: 'Qualia',
          film: 'Twenty crates, one agent',
          genre: 'Science fiction',
          runtime: '2h 04m',
          logline: 'Shared-memory arenas, crash-safe evidence logs, and a JEPA runtime whose promotion is gated on evidence.',
          cast: ['the arena', 'the evidence log', 'the jepa runtime'],
        },
        number: '03 of 20',
      },
    )}</div>`,
  },
};
