// The workbench loads the two stylesheets the site ships, in the same order
// its <head> loads them. There is no Storybook-only CSS: if a component needs
// a new rule, it goes into assets/notebook.css and both places get it.
import { themes } from 'storybook/theming';
import '../../assets/tokens.css';
import '../../assets/notebook.css';

/** @type { import('@storybook/html-vite').Preview } */
export default {
  parameters: {
    // Stories supply their own page shell (.wrap / .wide / full-bleed hero) so
    // what you measure in the workbench is what the site lays out.
    layout: 'fullscreen',
    // Storybook's own dark chrome for the docs page, so the workbench never
    // invents a colour of its own: site tokens live in the stylesheets only.
    docs: { theme: themes.dark },
    controls: { expanded: false },
    options: {
      storySort: {
        order: ['When to use what', 'Components', ['Button', 'Link', 'Card', 'Entry list', 'Table', 'Definition row', 'Range control', 'Notice', 'Poster', 'Campaign block', 'Now showing strip', 'Nav', 'Hero', 'Prose', 'Figure', 'Skeleton', 'Empty state', 'Footer', 'Identity parts'], 'Series']
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
