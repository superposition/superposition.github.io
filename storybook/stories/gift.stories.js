import { expect, waitFor } from 'storybook/test';

/* The gift: two states of one chip, and the panel a reader reads them in. The
   chip is the only place on the site where type sits on a parcel's own colour —
   cream on the ribbon while the parcel is closed, the ground on the paper once
   it is open — so its two pairs are in `npm run contrast` and restated here.

   The parcel itself is not a component. It is a mesh in the forest's scene, and
   `/forest/` is the only page that draws it; what a reader of this workbench can
   check is the part they read and press. */

const panel = ({ open = false, name = 'Cannoli Hell', sentence = 'A Bevy game where the collision shapes are the only thing that has ever been true.', species = 'Joint Vine', file = '/assets/flora/joint-15678126.svg' }) => `
<div class="forest-panel" style="display: grid">
  <p class="forest-count">05 / 19</p>
  <p class="forest-gift">
    <span class="forest-gift-state" data-open="${open}">The parcel is ${open ? 'open' : 'closed'}</span>
    <button class="btn btn-primary" type="button"${open ? ' disabled' : ''}>${open ? 'Parcel opened' : 'Open the parcel'}</button>
  </p>
  <p class="forest-sentence">${sentence}</p>
  <figure class="forest-specimen"${open ? '' : ' hidden'}>
    <img class="forest-specimen-img" src="${file}" alt="A ${species} specimen: the plant this repository grows in the garden" width="600" height="900">
    <figcaption class="forest-specimen-note">${species} · the species its topic grows on the garden page</figcaption>
  </figure>
  <p class="forest-where"><a class="text-link" href="#storybook-root">${name}</a></p>
  <p class="forest-controls">
    <button class="btn" type="button">Previous</button>
    <button class="btn" type="button">Next</button>
  </p>
</div>`;

export default {
  title: 'Forest/Gift',
  parameters: {
    usedOn: ['forest.html'],
    docs: {
      description: {
        component:
          'The parcel panel at the foot of the forest: a chip that states whether this browser has opened the parcel, the button that opens it, the sentence and its link, and — once it is open — the repository\'s own specimen from `_data/flora.yml`. The chip is the site\'s one surface where type sits on a gift colour. Measured by `npm run contrast`: `--star` on `--gift-ribbon` 7.07:1 closed, `--void` on `--gift-paper` 9.54:1 open; the ribbon against the paper it ties is 3.98:1, an edge.',
      },
    },
  },
  render: (args) => `<div class="wide" style="max-width: 34rem">${args.body}</div>`,
  argTypes: { body: { control: false } },
};

export const Closed = { args: { body: panel({ open: false }) } };

export const Opened = { args: { body: panel({ open: true }) } };

export const BothStates = {
  args: {
    body: `<div class="sg-row" style="display: flex; gap: 12px; align-items: center">
  <span class="forest-gift-state" data-open="false">The parcel is closed</span>
  <span class="forest-gift-state" data-open="true">The parcel is open</span>
</div>
<p class="kicker">The same chip, one state apart. The colour change is the parcel's: the dark ribbon while it is tied, the pale paper once it is open.</p>`,
  },
};

export const TheChip = {
  args: { body: panel({ open: false }) },
  play: async ({ canvasElement, step }) => {
    const chip = canvasElement.querySelector('.forest-gift-state');
    const button = canvasElement.querySelector('.btn-primary');

    await step('closed, the chip is the ribbon under cream', async () => {
      const style = getComputedStyle(chip);
      await expect(style.backgroundColor).toBe('rgb(122, 51, 72)');
      await expect(style.color).toBe('rgb(239, 230, 211)');
      await expect(chip.textContent.trim()).toBe('The parcel is closed');
    });

    await step('the button names the repository it would open', async () => {
      await expect(button.disabled).toBe(false);
      await expect(button.textContent.trim()).toBe('Open the parcel');
    });

    await step('the keyboard reaches the button and the ring is state cyan', async () => {
      button.focus();
      await expect(document.activeElement).toBe(button);
      await waitFor(() => expect(getComputedStyle(button).outlineColor).toBe('rgb(143, 211, 255)'));
    });
  },
};
