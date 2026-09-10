# Superposition

Public journal at https://superposition.github.io/. Markdown + Jekyll, published with GitHub Pages.

## Write

Start from `_drafts/experiment-template.md`. Drafts are excluded from production builds.
Preview drafts with `bundle exec jekyll serve --drafts`. Publish by moving the entry
to `_posts/YYYY-MM-DD-slug.md`, setting its date, and merging to `main`.

Use an `experiment_id` and `technical_record` link for work documented in Mage.
Keep narrative here and reproduction details in https://superposition.github.io/mage/.

## Build

```sh
bundle install
bundle exec jekyll build --strict_front_matter
bundle exec jekyll serve
```

Pull requests build a downloadable preview artifact. Default-branch pushes deploy.
No GPU, Python environment, or analytics account is needed. The previous homepage
remains recoverable in Git history. Identity: Superposition; Telegram @SuprPosition.
