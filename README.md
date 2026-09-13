# Superposition

Public journal at https://superposition.github.io/. Markdown + Jekyll, published with GitHub Pages.

## Write

Start from `_drafts/experiment-template.md`. Drafts are excluded from production builds.
Preview drafts with `bundle exec jekyll serve --drafts`. Publish by moving the entry
to `_posts/YYYY-MM-DD-slug.md`, setting its date, and merging to `main`.

Use an `experiment_id` and `technical_record` link for work documented in Mage.
Keep public writing focused on the mathematical ideas and why they matter.
The Mage field notes live at https://superposition.github.io/mage/.
Link code, setup, test logs, and detailed measurements to https://github.com/superposition/mage/.

## Build

```sh
bundle install
bundle exec jekyll build --strict_front_matter
bundle exec jekyll serve
```

Pull requests build a downloadable preview artifact. Default-branch pushes deploy.
No GPU, Python environment, or analytics account is needed. The previous homepage
remains recoverable in Git history. Identity: Superposition; Telegram @SuprPosition.

## Design

One stylesheet, `assets/notebook.css`, dresses every page: near-black stock, Inter at a
tight scale, hairline rules, and nothing else in the margins. The entries keep their own
colours — the figure SVGs, the mesh bands and the evidence tables were drawn against this
palette and are not restyled to taste.

The one ornament is a **Paper Shaders field**: a WebGL2 canvas running a fragment shader
from [`@paper-design/shaders`](https://github.com/paper-design/shaders) (Apache-2.0),
imported from jsDelivr by `assets/paper-field.js` — no bundler, no build step. A field is
markup:

```html
<div class="field" data-field="mesh" data-colors="#91baff,#c9b2ff" data-speed="0.15"></div>
```

`data-field="mesh"` is the flowing gradient (`data-colors`, `data-distortion`, `data-swirl`,
`data-grain-mixer`, `data-grain-overlay`, `data-speed`, `data-frame`); `data-field="grid"` is
the static dot pattern (`data-back`, `data-fill`, `data-stroke`, `data-gap`, `data-dot-size`,
`data-shape`). A field is decoration: it is `aria-hidden`, it mounts only when scrolled near,
it holds a still frame under `prefers-reduced-motion`, and it has a CSS gradient underneath
for a browser without WebGL2. `data-frame` sets which still, so a static page is reproducible.
Inter comes from Google Fonts; the system stack in `notebook.css` is the fallback.

`index.html` is **plain HTML**: no front matter, no Liquid, so Jekyll copies it verbatim.
Its entry list is maintained by hand — publishing an entry means adding it there too. The
journal, topics, projects, about and 404 pages are still Markdown/Liquid.

