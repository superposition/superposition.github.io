import { expect, userEvent, waitFor } from 'storybook/test';

const shell = (inner) => `<div class="wide">${inner}</div>`;

export default {
  title: 'Components/Button',
  parameters: {
    docs: {
      description: {
        component:
          'An action. For navigation between pages use a link; for an action that reads inside a sentence use the text variant.',
      },
    },
  },
  render: (args) => shell(`<p class="kicker">${args.note}</p><div class="sg-row">${args.body}</div>`),
  argTypes: {
    note: { control: false },
    body: { control: false },
  },
};

export const Primary = {
  args: {
    note: 'Primary: one per view. The amber fill, void type at 12.3:1, with the soft bloom; hover lifts to the peak and puts a cream edge on it.',
    body: '<a class="btn btn-primary" href="#storybook-root">Read the journal</a>',
  },
};

export const Secondary = {
  args: {
    note: 'Secondary: the alternative when two actions sit together.',
    body: '<a class="btn btn-secondary" href="#storybook-root">All repositories</a>',
  },
};

export const Ghost = {
  args: {
    note: 'Ghost: rows and chrome, where a filled box would be too loud.',
    body: '<a class="btn btn-ghost" href="#storybook-root">Skip</a>',
  },
};

export const Text = {
  args: {
    note: 'Text: an action that reads as a link, for use inside a sentence or a line of prose.',
    body: '<button class="btn btn-text" type="button">Copy the citation</button>',
  },
};

export const Sizes = {
  args: {
    note: 'Three sizes. Small for dense rows, large for the one action on a page.',
    body: [
      '<a class="btn btn-primary btn-sm" href="#storybook-root">Small</a>',
      '<a class="btn btn-primary" href="#storybook-root">Default</a>',
      '<a class="btn btn-primary btn-lg" href="#storybook-root">Large</a>',
    ].join(''),
  },
};

export const Disabled = {
  args: {
    note: 'Disabled is dust type inside a dashed dust edge. It never drops below the text minimum.',
    body: [
      '<button class="btn btn-primary" type="button" disabled>Primary</button>',
      '<button class="btn btn-secondary" type="button" disabled>Secondary</button>',
      '<button class="btn btn-ghost" type="button" disabled>Ghost</button>',
      '<a class="btn btn-primary" aria-disabled="true" role="button" tabindex="-1">Link button</a>',
    ].join(''),
  },
};

export const States = {
  args: {
    note: 'Hover it, tab to it, hold it down: the hover, focus-visible and active states are the live ones — no staged classes.',
    body: '<a class="btn btn-primary" href="#storybook-root">Primary, all states</a><a class="btn btn-secondary" href="#storybook-root">Secondary, all states</a>',
  },
  // The states are declared as transitions on the element, so the only honest
  // test is to point at it and to tab to it and read what the browser computed.
  play: async ({ canvasElement, step }) => {
    const button = canvasElement.querySelector('.btn-primary');
    const style = () => getComputedStyle(button);

    await step('at rest the fill is amber and nothing else is drawn', async () => {
      await expect(style().backgroundColor).toBe('rgb(255, 194, 74)');
      await expect(style().boxShadow).toContain('255, 194, 74');
      await expect(style().outlineStyle).toBe('none');
    });

    await step('hover is declared: the fill lifts to the peak, the edge goes cream', async () => {
      // A synthetic pointer does not set :hover in a real browser, and the real
      // mouse is only reachable from the test runner, so the hover state is read
      // where it is written: the rule this element's class matches.
      const hover = [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .find((rule) => rule.selectorText === '.btn-primary:hover');
      await expect(hover, '.btn-primary:hover is missing from notebook.css').toBeDefined();
      await expect(hover.style.background).toBe('var(--accent-peak)');
      await expect(hover.style.borderColor).toBe('var(--star)');
    });

    await step('the keyboard ring is state cyan, 2px, held off the edge', async () => {
      await userEvent.tab();
      await expect(document.activeElement).toBe(button);
      await expect(button.matches(':focus-visible')).toBe(true);
      await expect(style().outlineColor).toBe('rgb(143, 211, 255)');
      await expect(style().outlineWidth).toBe('2px');
      await expect(style().outlineOffset).toBe('3px');
      await waitFor(() => expect(style().boxShadow).toContain('143, 211, 255'));
    });

    await step('the ring follows the keyboard and leaves with it', async () => {
      await userEvent.tab();
      await expect(document.activeElement).not.toBe(button);
      await expect(style().outlineStyle).toBe('none');
    });
  },
};

export const Block = {
  args: {
    note: 'Block: full width of its container, for a single action in a narrow column.',
    body: '<a class="btn btn-primary btn-block" href="#storybook-root">Subscribe by RSS</a>',
  },
};
