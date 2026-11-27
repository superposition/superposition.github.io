const units = {
  vellum: {
    slug: 'vellum',
    name: 'Vellum-6',
    unit: 'Unit 01 · Keeps the record',
    role: 'Shipboard intelligence',
    library: 'Qualia',
    voice: 'I keep the record. You keep tuning in. One of those is archival.',
    alt: 'Vellum-6: a wide flat cream lamp head with an amber light bar and a small cyan indicator, over a narrow cream body whose chest panel carries four amber rules, a loop of paper tape hanging from one arm.',
    note: 'The shipboard intelligence. Cream body, amber signal, a cyan indicator line. A lamp head on a column, so the silhouette reads as a T at any size.',
  },
  gauge: {
    slug: 'gauge',
    name: 'Gauge-3',
    unit: 'Unit 02 · Reads heat and pressure',
    role: 'Engine mechanic',
    library: 'Mage',
    voice: "It's not broken. It's running hot, and hot is a number before it's a problem.",
    alt: 'Gauge-3: a squat figure in amber work armour under a cream diving-bell helmet whose round face is a pressure dial with an amber scale and a cream needle, and oversized cream fists banded in cyan.',
    note: 'The mechanic. Amber suit, cream helmet, cyan knuckles. Squat and wide against the other three, and the face is a dial rather than an eye.',
  },
  dray: {
    slug: 'dray',
    name: 'Dray-8',
    unit: 'Unit 03 · Runs the manifests',
    role: 'Lane courier',
    library: 'Reeldeal',
    voice: "Sealed, manifested, and already late. That's not a complaint, it's a schedule.",
    alt: 'Dray-8: a lean figure mid-stride in a flaring cyan coat, an arrow-shaped helmet with a cream visor slit, a cream strap and amber satchel across the chest, and a flat cream crate carried out to one side.',
    note: 'The courier. Cyan coat, cream crate, amber satchel. The leanest of the four: an arrow head, a flaring hem, and a crate carried out of frame to one side.',
  },
  sextant: {
    slug: 'sextant',
    name: 'Sextant-2',
    unit: 'Unit 04 · Holds every course at once',
    role: 'Navigator',
    library: 'Quantum Superposition',
    voice: 'Every course is open until the screen looks at it.',
    alt: 'Sextant-2: a tall cream-robed figure with a narrow helmet split by one vertical cyan slit, standing inside a broken cyan orbit marked with two amber points, one arm out to a small cream sighting ring.',
    note: 'The navigator. A broken cyan orbit and two amber marks, a cream robe, one vertical slit for a face. The ring is the whole identity, so it survives reduction to 48px.',
  },
};

const portrait = (u) => `/assets/series/${u.slug}.svg`;

const card = (u) => `<li class="cast-card">
  <img class="cast-portrait" src="${portrait(u)}" alt="${u.alt}" width="320" height="400">
  <p class="cast-unit">${u.unit}</p>
  <h3 class="cast-name">${u.name}</h3>
  <p class="cast-role">${u.role}</p>
  <p class="cast-front">Fronts <a href="#storybook-root">${u.library}</a></p>
  <p class="cast-voice">${u.voice}</p>
</li>`;

const single = (u) => `<div class="wide">
  <p class="kicker">${u.note}</p>
  <ul class="cast" style="grid-template-columns: minmax(0, 300px)">${card(u)}</ul>
  <p class="kicker">The same portrait at 48px, 96px and 320px. At 48 it is a lamp, a dome, an arrow and a ring: four silhouettes that stay apart.</p>
  <div class="sg-row">
    <img src="${portrait(u)}" alt="" width="48" height="60">
    <img src="${portrait(u)}" alt="" width="96" height="120">
    <img src="${portrait(u)}" alt="" width="320" height="400">
  </div>
</div>`;

export default {
  title: 'Series/Cast',
  parameters: {
    usedOn: ['series/index.html'],
    docs: {
      description: {
        component:
          'The Superposition Network: four characters, one per library, each a hand-authored SVG in assets/series/ at 320×400. The portraits are the shipped files, not redrawings, so a story and /series/ cannot drift apart. Measured: name --cream 15.44:1 on the void, role --starlight 15.44:1, the library link --amber 13.07:1.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Vellum = { args: { body: single(units.vellum) } };
export const Gauge = { args: { body: single(units.gauge) } };
export const Dray = { args: { body: single(units.dray) } };
export const Sextant = { args: { body: single(units.sextant) } };

export const CastCard = {
  args: {
    body: `<div class="wide">
  <p class="kicker">The line-up: four across above 700px, two across below it. This is /series/.</p>
  <ul class="cast">${Object.values(units).map(card).join('')}</ul>
</div>`,
  },
};

export const NetworkMasthead = {
  args: {
    body: `<section class="network">
  <div class="wide">
    <p class="network-bug"><span>Channel 06:17</span><span>Series one</span><span>4 units</span><span>Signal: amber</span></p>
    <h2 class="network-title">The Superposition <em>Network</em></h2>
    <p class="lede">Four characters, one per library, introduced the way a channel introduced a cartoon: a face, a job, and one line before the programme starts.</p>
  </div>
</section>`,
  },
};
