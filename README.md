# Superposition

A visual journal at https://superposition.github.io/. Jekyll, published with GitHub Pages.

The homepage uses a large live-type wordmark, rough ink orbital artwork, and three visual themes: marks, motion, and matter. The journal presents visual studies. The previous 16 generated articles were removed from publication on 12 September 2026 and remain recoverable in Git history. About, topics, projects, and the 404 page share the new design.

## Build and publish

Run `bundle install`, then `bundle exec jekyll build --strict_front_matter` or `bundle exec jekyll serve`. Pull requests build a downloadable preview artifact. Pushes to main deploy through .github/workflows/pages.yml.

## Repositories page

`/projects/` lists the public repositories, most recent push first, from `_data/repos.yml`. Regenerate that file after a repository is created, renamed, or pushed:

    scripts/sync-repos

The script calls `gh repo list` with your own GitHub CLI session and keeps public, non-fork, non-archived repositories pushed within the last twelve months. It writes only what GitHub reports, except where a repository has no description: those lines come from the `DESCRIPTIONS` table in the script, written from the repository's own README and source, and a repository with nothing to describe is recorded under `skipped` instead of published blank. `scripts/sync-repos --check` exits non-zero when the committed file is stale. The page reads the file at build time, so it needs no JavaScript and makes no API call.

## Crawling

`robots.txt` is a static file. `sitemap.xml` and `llms.txt` are Liquid templates over `site.html_pages` and `site.posts`, so both follow the site as pages and entries are added: the sitemap lists every page except the 404 and any page carrying `sitemap: false`, with `lastmod` only where a real date is known, and `llms.txt` lists each page with its description, then the journal entries and the repository count. `_includes/jsonld.html` holds the structured data for the home page, a journal entry, and an ordinary page; it needs `{% include jsonld.html %}` in the head of `_layouts/default.html` to reach every page.

## Artwork and type

Orbital artwork: generated with OpenAI's built-in image-generation tool from the user-approved concept, then extracted with the same tool. PNG is the source; WebP is the delivery format. Prompt: preserve the two interlocking rough black orbital rings and vermilion disc, remove all typography, navigation, captions, dividers, and thumbnails; render on a pure white background for ink blending on the site. Initial concept: bold primitive graphic journal with oversized condensed Superposition lettering, pale paper, black ink, a red disc, and sparse typography.

Glyphs are original inline SVG in _includes/glyph.html. Anton is self-hosted from the Google Fonts repository under the included SIL Open Font License (assets/fonts/OFL-Anton.txt). Body copy uses system monospace fonts. No runtime JavaScript, analytics, or third-party scripts are required.
