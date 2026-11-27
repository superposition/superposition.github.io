export default {
  title: 'Components/Skeleton',
  parameters: {
    usedOn: ['style.md'],
    docs: {
      description: {
        component:
          'What a page shows where a photograph has not arrived. The hero carries one behind the image (z-index -4 against the image s -3), so it is visible while the file is in flight and covered the moment it paints; if the file fails, the label is what remains and it says so. No shimmer: the site does not animate to fill time. The label is --dust at 6.70:1 on --deep. Under data-lab="a" and "b" the photograph is a faint wash over a lit panel, so the identity turns the skeleton off rather than stacking two panels.',
      },
    },
  },
  render: (args) => `<p class="kicker">${args.note}</p>${args.body}`,
  argTypes: { note: { control: false }, body: { control: false } },
};

const heroShell = (inner) => `<section class="hero" style="min-height: 320px">${inner}</section>`;
/* The hero's own photograph left with the flat backplate, so what the site still
   ships of this pattern is the design system's example on /style/. The stories
   carry the frame and its label; the box that holds them is the caller's. */
const skeleton = (label) =>
  `<span class="skeleton" style="position:absolute;inset:0" aria-hidden="true"><span class="skeleton-label">${label}</span></span>`;

export const Loading = {
  args: {
    note: 'The loading state: the frame, the raised panel, the label naming the file. This is what the first viewport is for the length of one request.',
    body: heroShell(skeleton('Loading the Carina Nebula')),
  },
};

export const Loaded = {
  args: {
    note: 'The same box once the photograph paints: the image sits over the skeleton and the frame is gone. The skeleton needs no class change and no script — the opaque image covers it.',
    body: heroShell(
      `${skeleton('Loading the Carina Nebula')}<img src="/assets/art/galaxy/carina-1600.webp" alt="The Cosmic Cliffs of the Carina Nebula: clouds of rust and blue gas rising against black space." width="1920" height="1111" fetchpriority="high">`,
    ),
  },
};

export const Failed = {
  args: {
    note: 'The error state, and the only place the red appears outside the 404: the file did not load, the label says which file, and the box does not collapse. This one is a .alert inside the skeleton label rather than a modifier class, so there is no state class to drift.',
    body: heroShell(
      `<span class="skeleton" style="position:absolute;inset:0" aria-hidden="true"><span class="skeleton-label"><span class="alert">The photograph did not load</span> Carina Nebula</span></span>`,
    ),
  },
};

export const Empty = {
  args: {
    note: 'A page that has no photograph to load shows nothing here: the hero falls back to the ground and the type carries it. An empty hero is a legitimate state, not a broken one.',
    body: heroShell('<div class="hero-inner wide"><h1 style="font-size: 48px">Superposition</h1></div>'),
  },
};
