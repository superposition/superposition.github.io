/* The now-showing strip: the programme in one row, stepped one poster per beat
   in CSS, with a checkbox as the pause control. Mirrors _includes/campaign/strip.html
   with six campaigns instead of twenty, so the loop is easy to watch and the
   pause can be tried without waiting through the whole programme. */

const shows = [
  { title: 'Mage', film: 'Inside the kernel, or around it', genre: 'Technical thriller', runtime: '1h 32m', logline: 'A terminal GPU profiler that makes the clock visible: inside the kernel, or around the call.', still: '/assets/repos/mage/kernel-progression-1200.webp' },
  { title: 'Qualia', film: 'Twenty crates, one agent', genre: 'Science fiction', runtime: '2h 04m', logline: 'Shared-memory arenas, crash-safe evidence logs, and a JEPA runtime whose promotion is gated on evidence.', field: true },
  { title: 'NAIWAN 91', film: 'Three standards, one groovebox', genre: 'Musical', runtime: '1h 44m', logline: 'Firmware that comps three jazz standards on one FM groovebox, drums and bass following the changes.', still: '/assets/repos/91/hero-752.webp' },
  { title: 'bend-ml-lab', film: 'The same loop, three runtimes', genre: 'Documentary', runtime: '1h 06m', logline: 'Einsum, training epochs and weight diagnostics in Bend 2, measured against C and NumPy twins.' },
  { title: 'DIVULGE', film: 'The binary, and the model', genre: 'Espionage', runtime: '1h 47m', logline: 'A native workbench that investigates a binary with a model in the loop, and the evidence beside it.' },
  { title: 'Topcoat Blocks', film: 'Your source, not a dependency', genre: 'Chamber piece', runtime: '0h 37m', logline: 'UI blocks copied into your application as its own source, with no dependency added.' },
];

const card = ({ title, film, genre, still, field, runtime, logline }, i) => `<li class="strip-item">
  <article class="poster poster--${field ? 'field' : 'still'}">
    <a class="poster-link" href="#storybook-root">
      <span class="poster-art">${field ? '' : `<img src="${still}" alt="" width="1200" height="750" loading="lazy" decoding="async">`}<span class="poster-no">${i + 1} of 6</span></span>
      <span class="poster-body">
        <span class="poster-genre">${genre}</span>
        <span class="poster-title">${title}</span>
        <span class="poster-film">${film}</span>
        <span class="poster-logline">${logline}</span>
        <span class="poster-cast"><span class="poster-cast-label">Starring</span><span class="poster-credit">the first part</span><span class="poster-credit">the second part</span></span>
        <span class="poster-slate"><span class="poster-now">In libraries now</span><span class="poster-run">${runtime}</span></span>
      </span>
    </a>
  </article>
</li>`;

const track = `<ol class="strip-track" style="--strip-steps: ${shows.length}">
    ${shows.map(card).join('')}
    ${shows
      .map(card)
      .map((item) => item.replace('<li class="strip-item">', '<li class="strip-item" aria-hidden="true">'))
      .join('')}
  </ol>`;

export default {
  title: 'Components/Now showing strip',
  parameters: {
    usedOn: ['index.html'],
    docs: {
      description: {
        component:
          'The home page strip. The track holds the programme twice and steps one card per beat, so the loop closes without a seam and without JavaScript. The pause control is a checkbox with a label — a strip that moves has to be stoppable (WCAG 2.2.2) — and prefers-reduced-motion stops the track and hides the control, leaving a snap-scrolled row of the same posters. Six of the twenty campaigns are here so the loop is watchable; the copy is _data/campaigns.yml s own.',
      },
    },
  },
  render: () => `<section class="now-showing" aria-labelledby="strip-title">
  <input type="checkbox" id="strip-pause" class="strip-toggle">
  <div class="wide now-showing-head">
    <h2 id="strip-title" class="section-title">Now showing</h2>
    <p class="kicker">Superposition Pictures · 6 campaigns · <a class="text-link" href="#storybook-root">The whole programme</a> · <label class="strip-pause" for="strip-pause"><span class="strip-pause-on">Pause the strip</span><span class="strip-pause-off">Resume the strip</span></label></p>
  </div>
  <div class="strip wide">${track}</div>
</section>`,
  argTypes: {},
};

export const Running = {};
