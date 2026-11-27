/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.js'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/html-vite', options: {} },
  // The stories show the real images and the real Anton file, so the site's
  // asset folder is served at the same /assets path the stylesheets use.
  // Paths here resolve against this config directory, not the project root.
  staticDirs: [{ from: '../../assets', to: '/assets' }],
  docs: { defaultName: 'Docs' },
};
