/* The now-showing strip: the programme in one row, stepped one poster per beat
   in CSS, with a checkbox as the pause control. Mirrors _includes/campaign/strip.html
   with six campaigns instead of twenty, so the loop is easy to watch and the
   pause can be tried without waiting through the whole programme. */

const shows = [
  { title: 'Mage', film: 'Inside the kernel, or around it', genre: 'Technical thriller', still: '/assets/repos/mage/kernel-progression-1200.webp' },
  { title: 'Qualia', film: 'Twenty crates, one agent', genre: 'Science fiction', still: '/assets/repos/qualia/console-brain-panel-800.webp', field: true },
  { title: 'NAIWAN 91', film: 'Three standards, one groovebox', genre: 'Musical', still: '/assets/repos/91/hero-752.webp' },
  { title: 'Cold Front', film: 'Eyes only, 71°10′N', genre: 'Espionage', still: '/assets/repos/coldfront/landing.webp' },
  { title: 'Hallway Shooter', film: 'Three hundred and twenty units', genre: 'Action', still: '/assets/art/galaxy/carina-1600.webp' },
  { title: 'Cannoli Hell', film: 'Four caves, one capsule', genre: 'Action', still: '/assets/repos/cannoli-hell/arena.webp' },
];

const card = ({ title, film, genre, still, field }, i) => `<li class="strip-item">
  <article class="poster poster--${field ? 'field' : 'still'}">
    <a class="poster-link" href="#storybook-root">
      <span class="poster-art">${field ? '' : `<img src="${still}" alt="" width="1200" height="1200" loading="lazy" decoding="async">`}<span class="poster-no">${i + 1} of 6</span></span>
      <span class="poster-body">
        <span class="poster-genre">${genre}</span>
        <span class="poster-title">${title}</span>
        <span class="poster-film">${film}</span>
        <span class="poster-logline">A logline lives here until the card is reprinted small, where it is dropped rather than set below 9px.</span>
        <span class="poster-cast"><span class="poster-cast-label">Starring</span><span class="poster-credit">the first part</span><span class="poster-credit">the second part</span></span>
        <span class="poster-slate"><span class="poster-now">In libraries now</span><span class="poster-run">1h 32m</span></span>
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
    docs: {
      description: {
        component:
          'The home page strip. The track holds the programme twice and steps half its own width in twenty jumps, so the loop closes without a seam and without JavaScript. The pause control is a checkbox with a label: a strip that moves has to be stoppable, and prefers-reduced-motion stops it and hides the control.',
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
