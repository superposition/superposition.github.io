import { expect, userEvent, waitFor } from 'storybook/test';

const glyph = `<svg class="soundtrack-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path class="soundtrack-play" d="M1 0.5 11 6 1 11.5Z"/><path class="soundtrack-pause" d="M1 0.5h3.2v11H1Zm6.8 0H11v11H7.8Z"/></svg>`;

const control = ({ pressed = 'false', pref = 'off' } = {}) =>
  `<button class="soundtrack-toggle" type="button" data-soundtrack-toggle aria-pressed="${pressed}"` +
  ` aria-label="${pressed === 'true' ? 'Pause the soundtrack' : 'Play the soundtrack'}"` +
  ` data-pref="${pref}">${glyph}Soundtrack</button>`;

const row = (button) =>
  `<p>${button} <span aria-hidden="true">/</span> <a href="#storybook-root">RSS</a> <span aria-hidden="true">/</span> <a href="#storybook-root">GitHub</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Credits</a> <span aria-hidden="true">/</span> <a href="#storybook-root">Say hello</a></p>`;

const shell = (inner) => `<div class="wrap"><footer class="site-footer wide"><div class="wrap">${inner}</div><audio preload="none" loop data-soundtrack-audio data-src="/assets/audio/superposition.m4a"></audio></footer></div>`;

const rule = (selector) =>
  [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch (error) {
        return [];
      }
    })
    .find((r) => r.selectorText === selector);

export default {
  title: 'Components/Soundtrack',
  parameters: {
    usedOn: ['_layouts/default.html'],
    docs: {
      description: {
        component:
          'The site\'s own track, in the footer row with the quiet links: the first thing in the row, because it is the only control in the footer that does something rather than going somewhere. A button with aria-pressed, a 44px square target (--target-touch) since it is pressed on a phone, --starlight at rest at 15.44:1, --accent-text on hover and for a listener who has chosen the music before, and the 2px --state ring at a 4px offset. The audio element preloads nothing and carries no src: the file is fetched on the first press and not before. The visible word never changes and the glyph fills the same 12px box, so pressing it cannot reflow the row.',
      },
    },
  },
  render: (args) => shell(row(args.button)),
  argTypes: { button: { control: false } },
};

export const AtRest = {
  args: { button: control() },
  play: async ({ canvasElement, step }) => {
    const button = canvasElement.querySelector('.soundtrack-toggle');

    await step('it is a toggle, off, and it says what a press will do', async () => {
      await expect(button.getAttribute('aria-pressed')).toBe('false');
      await expect(button.getAttribute('aria-label')).toBe('Play the soundtrack');
      await expect(button.tagName).toBe('BUTTON');
      await expect(button.getAttribute('type')).toBe('button');
    });

    await step('the target is 44 by 44, not 24', async () => {
      const box = button.getBoundingClientRect();
      await expect(box.height).toBeGreaterThanOrEqual(44);
      await expect(box.width).toBeGreaterThanOrEqual(44);
    });

    await step('the play glyph is drawn and the pause glyph is not', async () => {
      const play = canvasElement.querySelector('.soundtrack-play');
      const pause = canvasElement.querySelector('.soundtrack-pause');
      await expect(getComputedStyle(play).display).not.toBe('none');
      await expect(getComputedStyle(pause).display).toBe('none');
    });

    await step('nothing is fetched until a press: no src, preload none', async () => {
      const audio = canvasElement.querySelector('[data-soundtrack-audio]');
      await expect(audio.hasAttribute('src')).toBe(false);
      await expect(audio.getAttribute('preload')).toBe('none');
      await expect(audio.hasAttribute('loop')).toBe(true);
    });
  },
};

export const Playing = {
  args: { button: control({ pressed: 'true', pref: 'on' }) },
  play: async ({ canvasElement, step }) => {
    const button = canvasElement.querySelector('.soundtrack-toggle');

    await step('pressed, the button offers the pause and says so', async () => {
      await expect(button.getAttribute('aria-pressed')).toBe('true');
      await expect(button.getAttribute('aria-label')).toBe('Pause the soundtrack');
    });

    await step('the two glyphs swap inside the same box, so the row cannot move', async () => {
      const play = canvasElement.querySelector('.soundtrack-play');
      const pause = canvasElement.querySelector('.soundtrack-pause');
      await expect(getComputedStyle(play).display).toBe('none');
      await expect(getComputedStyle(pause).display).not.toBe('none');
      const svg = canvasElement.querySelector('.soundtrack-icon').getBoundingClientRect();
      await expect(svg.width).toBe(12);
      await expect(svg.height).toBe(12);
    });

    await step('a returning listener gets the accent colour, never a play', async () => {
      await expect(button.getAttribute('data-pref')).toBe('on');
      await expect(getComputedStyle(button).color).toBe('rgb(255, 194, 74)');
    });
  },
};

export const Keyboard = {
  args: { button: control() },
  play: async ({ canvasElement, step }) => {
    const button = canvasElement.querySelector('.soundtrack-toggle');

    await step('the ring is state cyan, 2px, held 4px off the box', async () => {
      button.focus();
      await expect(button.matches(':focus-visible')).toBe(true);
      const style = getComputedStyle(button);
      await expect(style.outlineColor).toBe('rgb(143, 211, 255)');
      await expect(style.outlineWidth).toBe('2px');
      await expect(style.outlineOffset).toBe('4px');
    });

    await step('hover lifts to the accent and underline, as a footer link does', async () => {
      const hover = rule('.soundtrack-toggle:hover');
      await expect(hover, '.soundtrack-toggle:hover is missing from notebook.css').toBeDefined();
      await expect(hover.style.color).toBe('var(--accent-text)');
      await expect(hover.style.textDecoration).toBe('underline');
    });

    await step('the ring leaves with the keyboard', async () => {
      button.blur();
      await waitFor(() => expect(getComputedStyle(button).outlineStyle).toBe('none'));
    });
  },
};
