/* Builds the vendored subset of three.js that the forest page loads.

   The page does not load three's published bundle. That bundle is 418 KB
   gzipped — the renderer, every material, every loader, the WebGPU backend, all
   of it — and the bear needs about a third of it. This script imports the
   symbols below from three's sources and lets esbuild drop everything the scene
   cannot reach, which is what makes the page's whole renderer fit in the
   reading budget.

   It is a one-off, like `scripts/starfield.py`: it runs when the pinned version
   changes, not on every build, and its output is committed beside its licence.

     mkdir -p /tmp/three-build && cd /tmp/three-build
     npm init -y && npm i three@0.187.0 esbuild@0.25.12
     node <this repo>/assets/forest/three-build.mjs /tmp/three-build/node_modules

   `three` and `esbuild` are deliberately not dependencies of this repository:
   the site has no JavaScript build step, and adding one for a file that changes
   once a year would cost every contributor an `npm ci`. The version is pinned
   in the banner of the output, so the file says what made it. */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VERSION = '0.187.0';
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'vendor', 'three', 'three.subset.js');
const licence = resolve(here, '..', 'vendor', 'three', 'LICENSE');

const modules = process.argv[2];
if (!modules) {
  console.error('usage: node assets/forest/three-build.mjs <path to node_modules>');
  process.exit(1);
}

/* Exactly what the scene uses, and nothing for luck. `MathUtils` and the
   geometry primitives are here because the bear is built from them; every
   material but Lambert is absent because the scene is one flat-shaded
   vertex-coloured material and a fog. */
const SYMBOLS = [
  'BoxGeometry', 'BufferAttribute', 'BufferGeometry', 'Color', 'ConeGeometry',
  'CylinderGeometry', 'DirectionalLight', 'Fog', 'Group', 'HemisphereLight',
  'IcosahedronGeometry', 'Mesh', 'MeshLambertMaterial', 'PerspectiveCamera',
  'Scene', 'WebGLRenderer',
];

const entry = join(here, '.three-entry.js');
writeFileSync(entry, `export { ${SYMBOLS.join(', ')} } from 'three/src/Three.js';\n`);

const banner = `/* three.js r${VERSION.split('.')[1]} — subset
   three.js is Copyright © 2010-2026 three.js authors, MIT licensed. The full
   licence is in this folder as LICENSE.
   Built from three@${VERSION} by assets/forest/three-build.mjs with esbuild,
   importing only: ${SYMBOLS.join(', ')}. Do not edit by hand; rebuild with that
   script and commit the result beside it. */
`;

mkdirSync(dirname(out), { recursive: true });
const esbuild = await import(pathToFileURL(join(modules, 'esbuild', 'lib', 'main.js')).href);
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  minify: true,
  legalComments: 'none',
  nodePaths: [modules],
  banner: { js: banner },
  outfile: out,
});

if (existsSync(join(modules, 'three', 'LICENSE'))) {
  writeFileSync(licence, readFileSync(join(modules, 'three', 'LICENSE')));
}

console.log(`wrote ${out} (${(readFileSync(out).length / 1024).toFixed(1)} KB)`);
