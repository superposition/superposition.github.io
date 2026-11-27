const figure = (src, srcset, sizes, width, height, alt, caption) =>
  `<figure class="figure">
    <img src="${src}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ''} width="${width}" height="${height}" loading="lazy" alt="${alt}">
    <figcaption>${caption}</figcaption>
  </figure>`;

export default {
  title: 'Components/Figure',
  parameters: {
    docs: {
      description: {
        component:
          'A picture with a caption. The width and height attributes are the file’s real ones so the browser reserves the right box, but the drawn height always comes from the ratio: width 100%, height auto. That rule is why a picture cannot arrive stretched.',
      },
    },
  },
  render: (args) => `<div class="wrap"><div class="prose">${args.note ? `<p>${args.note}</p>` : ''}${args.body}</div></div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const WithCaption = {
  args: {
    note: '',
    body: figure(
      '/assets/art/galaxy/andromeda-960.webp',
      '',
      '',
      1280,
      720,
      'A panoramic field of stars in Andromeda.',
      'Andromeda panorama. NASA/JPL-Caltech.',
    ),
  },
};

export const Srcset = {
  args: {
    note: 'With a srcset, the browser picks 960w or 1280w from the rendered width; sizes says how wide it will be drawn.',
    body: figure(
      '/assets/art/galaxy/andromeda-1280.webp',
      '/assets/art/galaxy/andromeda-960.webp 960w, /assets/art/galaxy/andromeda-1280.webp 1280w',
      '(max-width: 700px) 100vw, 64ch',
      1280,
      720,
      'A panoramic field of stars in Andromeda.',
      'Andromeda panorama, 1280×720. The figure measures min(100%, 1000px) inside prose.',
    ),
  },
};

export const TallAndWide = {
  args: {
    note: 'Two ratios in the same column: the Sombrero at 1200×1462 and Andromeda at 1280×720. Neither is distorted, because the attributes set the reserved box and never the drawn height.',
    body: [
      figure('/assets/art/galaxy/sombrero-1200.webp', '', '', 1200, 1462, 'The Sombrero Galaxy seen edge-on.', 'Sombrero, 1200×1462 — a 0.82 ratio.'),
      figure('/assets/art/galaxy/andromeda-960.webp', '', '', 960, 540, 'A field of stars in Andromeda.', 'Andromeda, 960×540 — a 1.78 ratio.'),
    ].join(''),
  },
};

export const OutsideMeasure = {
  args: {
    note: 'The same figure outside prose, at the wide measure: still capped at 1000px so a photograph never runs the full 1200px column.',
    body: figure(
      '/assets/art/galaxy/barred-1600.webp',
      '/assets/art/galaxy/barred-1600.webp 1600w, /assets/art/galaxy/barred-1920.webp 1920w',
      '(max-width: 700px) 100vw, 1000px',
      1600,
      912,
      'A barred spiral galaxy.',
      'Barred spiral galaxy. NASA/GSFC.',
    ),
  },
};
