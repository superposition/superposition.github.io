/* The manager: Storybook's own chrome, not the stories.

   Two jobs, both of them presentation. It applies the workbench theme, and it
   hides the zoom tool, which exists for pixel-peeping a component's rendering
   and is not what this workbench is for — a component is judged at a viewport,
   and the viewport presets in the toolbar are the honest way to do that. The
   zoom shortcuts (alt 0, alt =, alt -) go with it. */

import { addons } from 'storybook/manager-api';
import { workbenchTheme } from './theme';

addons.setConfig({
  theme: workbenchTheme,
  showNav: true,
  showPanel: true,
  panelPosition: 'bottom',
  enableShortcuts: true,
  toolbar: {
    // id "zoom": in, out, and the reset inside its percentage popover.
    zoom: { hidden: true },
  },
});
