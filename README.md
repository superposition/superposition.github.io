# Superposition

A visual journal at https://superposition.github.io/. Jekyll, published with GitHub Pages.

The homepage uses a large live-type wordmark, rough ink orbital artwork, and three visual themes: marks, motion, and matter. The journal presents visual studies. The previous 16 generated articles were removed from publication on 12 September 2026 and remain recoverable in Git history. About, topics, projects, and the 404 page share the new design.

## Build and publish

Run `bundle install`, then `bundle exec jekyll build --strict_front_matter` or `bundle exec jekyll serve`. Pull requests build a downloadable preview artifact. Pushes to main deploy through .github/workflows/pages.yml.

## Artwork and type

Orbital artwork: generated with OpenAI's built-in image-generation tool from the user-approved concept, then extracted with the same tool. PNG is the source; WebP is the delivery format. Prompt: preserve the two interlocking rough black orbital rings and vermilion disc, remove all typography, navigation, captions, dividers, and thumbnails; render on a pure white background for ink blending on the site. Initial concept: bold primitive graphic journal with oversized condensed Superposition lettering, pale paper, black ink, a red disc, and sparse typography.

Glyphs are original inline SVG in _includes/glyph.html. Anton is self-hosted from the Google Fonts repository under the included SIL Open Font License (assets/fonts/OFL-Anton.txt). Body copy uses system monospace fonts. No runtime JavaScript, analytics, or third-party scripts are required.
