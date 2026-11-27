import remarkGfm from 'remark-gfm';

/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.js'],
  addons: [
    // Tables in an .mdx page are GitHub-flavoured markdown, which MDX does not
    // read without a plugin: without remark-gfm a table renders as a paragraph
    // of pipes, so every table on every docs page depends on these options.
    {
      name: '@storybook/addon-docs',
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: { name: '@storybook/html-vite', options: {} },
  // The stories show the real images and the real Anton file, so the site's
  // asset folder is served at the same /assets path the stylesheets use.
  // Paths here resolve against this config directory, not the project root.
  staticDirs: [{ from: '../../assets', to: '/assets' }],
  docs: { defaultName: 'Docs' },
};
