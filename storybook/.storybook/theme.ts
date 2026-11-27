/* The workbench's own chrome: black ground, amber accent, cream type.

   Storybook's manager is a separate document from the preview iframe, so it
   cannot read assets/tokens.css. Every value below is copied by hand from that
   file, from the `:root` block (the shipped identity, data-lab="c"). This is the
   one place on the workbench where a colour is written twice: if a token in
   assets/tokens.css changes, change it here in the same commit.

   The preview iframe does not use this file for anything but the docs page: a
   story is styled by the two real stylesheets and by nothing else. */

import { create } from 'storybook/theming/create';

// assets/tokens.css :root — `--void`, `--deep`, `--surface`, `--line`
const ground = '#000000'; // --void: the page contributes no light
const block = '#131118'; // --deep: one step up, where a block sits
const raised = '#1c1a20'; // --surface
const line = 'rgba(242,230,216,.14)'; // --line: the one hairline

// assets/tokens.css :root — `--star`, `--cream`/`--starlight`, `--dust`
const star = '#efe6d3'; // --star: headings
const cream = '#e6dcc8'; // --cream, aliased as --starlight: body
const dust = '#a99884'; // --dust: meta and captions

// assets/tokens.css :root — `--amber`/`--accent-text`, `--cyan`/`--state`
const amber = '#ffc24a'; // the signal: chrome links, the wordmark
const cyan = '#8fd3ff'; // the second signal: state and focus

// assets/tokens.css :root — `--font-text`, `--font-mono`. The display face is
// left out on purpose: Anton is for a page's own name, not for a control panel.
const text = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";
const mono = "'IBM Plex Mono', ui-monospace, 'SF Mono', 'Cascadia Mono', 'Courier New', monospace";

/** The manager chrome, and the docs page inside the preview iframe. */
export const workbenchTheme = create({
  base: 'dark',

  brandTitle: 'Superposition',
  brandUrl: 'https://superposition.github.io',
  brandTarget: '_self',

  fontBase: text,
  fontCode: mono,

  appBg: ground,
  appContentBg: block,
  appPreviewBg: ground,
  appBorderColor: line,
  appBorderRadius: 0,

  colorPrimary: amber,
  colorSecondary: cyan,

  barBg: ground,
  barTextColor: dust,
  barSelectedColor: amber,
  barHoverColor: amber,

  textColor: cream,
  textInverseColor: ground,
  textMutedColor: dust,

  inputBg: block,
  inputBorder: line,
  inputTextColor: star,
  inputBorderRadius: 0,

  buttonBg: raised,
  buttonBorder: line,
  booleanBg: block,
  booleanSelectedBg: raised,

  // The preview is the site, and the site is black in all three identities, so
  // the canvas never flashes the manager's own grey while a story loads.
  previewBg: ground,
});
