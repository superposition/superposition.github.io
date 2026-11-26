# Superposition

Notes on mathematics, AI, and the systems behind them, at https://superposition.github.io/. Jekyll, published with GitHub Pages.

The site is text first: a single column, one accent colour, and the ink artwork (`assets/art/orbits.webp`) as one band below the writing on the home page. The previous 16 generated articles were removed from publication on 12 September 2026 and remain recoverable in Git history.

## Journal

Entries belong to one of five topics — Data informatics, AI, Matrices, Kinematics, Cryptographic proofs — listed in `_data/topics.yml`. The home page, `/journal/` and `/topics/` all read that file.

An entry is a file in `_posts/YYYY-MM-DD-slug.md`, published at `/journal/:title/`:

```yaml
---
title: What a matrix does to a basis
description: One line, shown in the journal index.
date: 2026-11-20 09:00:00 -0500
topic: matrices
---
```

`topic` must be a slug from `_data/topics.yml`; the journal groups by it, and an entry without one publishes but is listed under no topic.

Mathematics is kramdown's math, rendered by MathJax 3 on pages that ask for it (`math: true`, on by default for entries): inline `$...$`, display in its own paragraph as `$$...$$`. Figures are plain HTML in the markdown, so the caption is yours:

```html
<figure>
  <img src="/assets/art/example.png" alt="What it shows." width="1200" height="800">
  <figcaption>The caption.</figcaption>
</figure>
```

Audio renders only when an entry declares it, either self-hosted (`audio: {title, src, note}`) or as an embed (`audio: {title, embed, note}`).

`_drafts/` holds three example entries — mathematics, figures, audio — that prove the layout without publishing. `bundle exec jekyll build --drafts` renders them locally.

## Build and publish

Run `bundle install`, then `bundle exec jekyll build --strict_front_matter` or `bundle exec jekyll serve`. Pull requests build a downloadable preview artifact. Pushes to main deploy through .github/workflows/pages.yml.

## Repositories page

`/projects/` lists the public repositories, most recent push first, from `_data/repos.yml`. Regenerate that file after a repository is created, renamed, or pushed:

    scripts/sync-repos

The script calls `gh repo list` with your own GitHub CLI session and keeps public, non-fork, non-archived repositories pushed within the last twelve months. It writes only what GitHub reports, except where a repository has no description: those lines come from the `DESCRIPTIONS` table in the script, written from the repository's own README and source, and a repository with nothing to describe is recorded under `skipped` instead of published blank. `scripts/sync-repos --check` exits non-zero when the committed file is stale. The page reads the file at build time, so it needs no JavaScript and makes no API call.

## Crawling

`robots.txt` is a static file. `sitemap.xml` and `llms.txt` are Liquid templates over `site.html_pages` and `site.posts`, so both follow the site as pages and entries are added: the sitemap lists every page except the 404 and any page carrying `sitemap: false`, with `lastmod` only where a real date is known, and `llms.txt` lists each page with its description, then the journal entries and the repository count. `_includes/jsonld.html` holds the structured data for the home page, a journal entry, and an ordinary page; the head of `_layouts/default.html` includes it, so it reaches every page.

## Artwork and type

Orbital artwork: generated with OpenAI's built-in image-generation tool from the user-approved concept, then extracted with the same tool. PNG is the source; WebP is the delivery format. Prompt: preserve the two interlocking rough black orbital rings and vermilion disc, remove all typography, navigation, captions, dividers, and thumbnails; render on a pure white background for ink blending on the site. Initial concept: bold primitive graphic journal with oversized condensed Superposition lettering, pale paper, black ink, a red disc, and sparse typography.

Anton is self-hosted from the Google Fonts repository under the included SIL Open Font License (assets/fonts/OFL-Anton.txt). Body copy uses system monospace fonts. No runtime JavaScript except MathJax on entry pages; no analytics, no third-party scripts.
