# three.js, vendored

`three@0.187.0`, MIT (see `LICENSE` in this directory). Committed rather than
fetched at runtime: the site makes no third-party requests.

| File | From | sha256 |
|---|---|---|
| `three.module.min.js` | `npm pack three@0.187.0`, `build/three.module.js` bundled with `esbuild --bundle --minify --format=esm --legal-comments=none` | `90f77e02…66c0cf` |
| `lines.module.min.js` | the same package, `examples/jsm/lines/{LineSegments2,LineSegmentsGeometry,LineMaterial}.js` bundled the same way with `--external:three` | `cb1534e4…26038c` |

Sizes: `three.module.min.js` 748,656 bytes (189,579 gzipped), `lines.module.min.js`
17,702 bytes (5,521 gzipped). The line addon is separate so a page that only
uses meshes (the low-poly scene on `/workbench/`) does not download it.

This copy is shared infrastructure: the home page's investigation map imports it
through the import map in `_layouts/default.html`, and every other scene on the
site is expected to import the same two files rather than vendoring a second
copy. A page opts in with `scene:` in its front matter, which is the only place
the import map is emitted, so no other page pays for it.

Rebuild, if a version bump is ever wanted:

```sh
npm pack three@0.187.0 && tar -xzf three-0.187.0.tgz
npx esbuild package/build/three.module.js --bundle --minify --format=esm \
  --legal-comments=none --outfile=three.module.min.js
npx esbuild addons/entry.js --bundle --minify --format=esm \
  --legal-comments=none --external:three --outfile=lines.module.min.js
```

`addons/entry.js` is three lines, re-exporting the three line classes above.
Minifying the npm tarball rather than downloading a CDN build keeps the
provenance a single pinned package: the only step that is not `npm pack` is the
esbuild invocation written out here.
