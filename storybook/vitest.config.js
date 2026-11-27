/* Runs the play functions in the stories as tests, in a real browser.

   Run: npm run test          (once)
        npm run test:watch    (the addon's panel drives the same project)

   Only stories that carry a `play` function become tests, so this stays a short
   suite of interaction checks: the identity toolbar switches, the strip pauses,
   a button's hover and focus states exist, the header wraps on a narrow phone.
   A play function that only asserts a story rendered is not worth its runtime,
   and the accessibility gate is a separate command (`npm run a11y`). */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
