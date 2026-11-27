/* The campaign block on a repository page: the poster beside the billing and,
   when the repository has more than one figure, the rest of them as stills.
   Mirrors _includes/campaign/block.html. */

const film = {
  genre: 'Technical thriller',
  film: 'Inside the kernel, or around it',
  logline: 'A terminal GPU profiler that makes the clock visible: inside the kernel, or around the call.',
  runtime: '1h 32m',
};

const poster = `<article class="poster poster--still">
  <a class="poster-link" href="#storybook-root">
    <span class="poster-art">
      <img src="/assets/repos/mage/kernel-progression-1200.webp" alt="" loading="lazy" decoding="async">
      <span class="poster-no">02 of 20</span>
    </span>
    <span class="poster-body">
      <span class="poster-genre">${film.genre}</span>
      <span class="poster-title">Mage</span>
      <span class="poster-film">${film.film}</span>
      <span class="poster-logline">${film.logline}</span>
      <span class="poster-cast"><span class="poster-cast-label">Starring</span><span class="poster-credit">the profiler</span><span class="poster-credit">the kernel</span><span class="poster-credit">the wall clock</span></span>
      <span class="poster-slate"><span class="poster-now">In libraries now</span><span class="poster-run">${film.runtime}</span></span>
    </span>
  </a>
</article>`;

const stills = `<p class="kicker campaign-stills-label">Stills</p>
    <div class="campaign-stills">
      <figure class="campaign-still"><img src="/assets/repos/mage/comparison-views-1200.webp" alt="Bar charts of GPU kernel time, and of time around the call, per operation." width="1200" height="750" loading="lazy" decoding="async"><figcaption>Bar charts of GPU kernel time, and of time around the call, per operation. · From the repository</figcaption></figure>
      <figure class="campaign-still"><img src="/assets/repos/mage/matmul-layouts-1200.webp" alt="Two schematics of the same matmul, one threaded by the compiler and one by the kernel author." width="1200" height="750" loading="lazy" decoding="async"><figcaption>Two schematics of the same matmul. · From the repository</figcaption></figure>
    </div>`;

export default {
  title: 'Components/Campaign block',
  parameters: {
    docs: {
      description: {
        component:
          'The showing on a repository page: the poster at the left, the billing at the right, stills under it. It sits above the prose and changes nothing about it — the page still answers what the library is and how it is built.',
      },
    },
  },
  render: (args) => `<div class="wide">${args.body}</div>`,
  argTypes: { body: { control: false } },
};

export const WithStills = {
  args: {
    body: `<section class="campaign" aria-labelledby="campaign-title">
  <div class="campaign-poster">${poster}</div>
  <div class="campaign-body">
    <p class="campaign-kicker"><span class="decal">Superposition Pictures</span><span class="kicker">${film.genre}</span></p>
    <h2 id="campaign-title" class="campaign-title">${film.film}</h2>
    <p class="campaign-logline">${film.logline}</p>
    <p class="campaign-meta">${film.genre} · ${film.runtime} · <a class="text-link" href="#storybook-root">In libraries now</a></p>
    ${stills}
  </div>
</section>`,
  },
};

export const PosterOnly = {
  args: {
    body: `<section class="campaign" aria-labelledby="campaign-title">
  <div class="campaign-poster">${poster}</div>
  <div class="campaign-body">
    <p class="campaign-kicker"><span class="decal">Superposition Pictures</span><span class="kicker">Chamber piece</span></p>
    <h2 id="campaign-title" class="campaign-title">A deposit, and the total</h2>
    <p class="campaign-logline">A Starknet contract of about a hundred lines: one deposit per caller, and the running total.</p>
    <p class="campaign-meta">Chamber piece · 0h 41m · <a class="text-link" href="#storybook-root">In libraries now</a></p>
  </div>
</section>`,
  },
};
