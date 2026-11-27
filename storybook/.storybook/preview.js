// The workbench loads the two stylesheets the site ships, in the same order
// its <head> loads them. There is no Storybook-only CSS: if a component needs
// a new rule, it goes into assets/notebook.css and both places get it.
import '../../assets/tokens.css';
import '../../assets/notebook.css';
// The docs page is the one surface inside the preview that is not a story: it
// is Storybook's own document, so it is drawn in the workbench theme, whose
// values are copied from the same tokens. See .storybook/theme.ts.
import { workbenchTheme } from './theme';

/** @type { import('@storybook/html-vite').Preview } */
export default {
  parameters: {
    // Stories supply their own page shell (.wrap / .wide / full-bleed hero) so
    // what you measure in the workbench is what the site lays out.
    layout: 'fullscreen',
    docs: { theme: workbenchTheme },
    controls: { expanded: false },

    // The three widths this site is designed and judged at: the full column,
    // the width the header holds one line, and the narrowest phone it supports.
    viewport: {
      defaultViewport: 'desktop-1440',
      options: {
        'desktop-1440': { name: 'desktop 1440', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
        'phone-420': { name: 'phone 420', styles: { width: '420px', height: '900px' }, type: 'mobile' },
        'phone-375': { name: 'phone 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
      },
    },

    // A component has two grounds on this site: the page's own black, and a
    // photograph behind the hero. Judge a component on both — a translucent
    // edge or a dust label reads differently on a lit image.
    backgrounds: {
      default: 'ground',
      options: {
        ground: { name: 'ground', value: '#000000' }, // --void
        photograph: {
          name: 'photograph',
          value: "url('/assets/art/galaxy/carina-1600.webp') center / cover no-repeat",
        },
      },
    },

    // The accessibility panel reports on every story; the gate is the command,
    // `npm run a11y`, which runs axe over the whole build and exits non-zero.
    // Set to "error" here and every story would fail the interaction run too,
    // which would make one violation report twice.
    a11y: { test: 'todo' },

    options: {
      storySort: {
        order: [
          'The workbench',
          'When to use what',
          'Components',
          [
            'Button',
            'Link',
            'Badge',
            'Card',
            'Poster',
            'Campaign block',
            'Now showing strip',
            'Entry list',
            'Nav',
            'Hero',
            'Prose',
            'Figure',
            'Empty state',
            'Footer',
            'Identity parts',
            'Pagination',
          ],
          'Series',
        ],
      },
    },
  },
};

// The three identities are switched by one attribute on the root element, which
// a story cannot render inside its own fragment. This decorator sets it for the
// whole workbench from the toolbar, so a story is seen in the identity it is
// about. It is workbench code only: the site ships no JavaScript.
export const globalTypes = {
  identity: {
    description: 'data-lab identity',
    toolbar: {
      title: 'Identity',
      icon: 'paintbrush',
      items: [
        { value: 'c', title: 'c — shipped (hybrid)' },
        { value: 'a', title: 'a — instrument' },
        { value: 'b', title: 'b — poster' },
      ],
      dynamicTitle: true,
    },
  },
};
export const initialGlobals = { identity: 'c' };
export const decorators = [
  (story, context) => {
    document.documentElement.setAttribute('data-lab', context.globals.identity ?? 'c');
    return story();
  },
];
