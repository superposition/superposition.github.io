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
        order: ['When to use what', 'Components', ['Button', 'Link', 'Badge', 'Card', 'Entry list', 'Nav', 'Hero', 'Prose', 'Figure', 'Empty state', 'Footer', 'Pagination']],
      },
    },
  },
};
