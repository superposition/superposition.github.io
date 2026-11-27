# Superposition design system

This file is the short version. It exists so nobody has to read a 200-line copy of the token file to find out what the rules are. It no longer lists values, because a second copy of a value is a copy that drifts: the last version of this document still described a `--nebula` token, a `--plum` fill and four badge variants two merges after the stylesheet dropped them.

The canonical sources, in order:

| What | Where |
| --- | --- |
| Every value the site can express | `assets/tokens.css`, with the measured contrast in its header |
| Every component, rendered live | `/style/` (`style.md`) |
| Every component, its states, and the page that adopts it | `storybook/stories/`, under `npm run storybook` |
| The rules, as checks | `storybook/scripts/slop.mjs`, `a11y.mjs`, `contrast.mjs` |

## The five rules

1. **Tokens or nothing.** `assets/notebook.css` names no colour, length, gradient, shadow, radius or font size. `npm run slop` fails on a literal, on a `var()` the token file does not declare, and on a token nothing reads.
2. **Used or deleted.** A component names, in its story's `usedOn`, the page that renders it. A class no page renders and a story that names no page both fail the same check. Nothing is kept for later.
3. **Real content.** Stories and `/style/` use the site's own copy: real repository names from `_data/repos.yml`, real dates from the repository pages, real measured contrast. No placeholder prose.
4. **States are real.** Every interactive component declares rest, hover, focus-visible and active, and disabled where it can be unavailable. `npm run a11y` fails when one is missing, when a target is under 24 × 24px at 1440 or at 360, when an image has no alt or no reserved box, and when an animation has no reduced-motion answer.
5. **Hierarchy before decoration.** No card shadow, no gradient button, no centred-everything, one accent per component. Amber is the accent, cyan is state, red is the 404 and a photograph that failed.

## Adding a page

Use `layout: default` and start with `<div class="wrap">`; use `wide` for anything that needs the 1200px measure. Take every value from a token.

- An eyebrow is `<span class="decal">`. A block that carries a figure, a photograph or an empty state already has the HUD frame — it is attached to `.figure`, `.card`, `.audio` and `.empty-state`, not to a new class.
- A caveat beside the argument is `<aside class="notice">` with `.notice-title` and `.notice-text`. A repository page can carry one from front matter under `notice:`.
- Facts about a repository are `<dl class="def">` with `.def-row`, `dt` and `dd`.
- A list of columns is `<table class="table">`, `table--compact` where it is scanned rather than read.
- A list that grows past a screen and needs jumping is `<nav class="range">` with `.range-list` and `.range-link`.
- An action is `.btn.btn-primary`, once per page. A way out of a page is `.text-link`.

## What was removed, and why

Each of these had no page rendering it, so it was deleted rather than maintained:

| Component | Why it went |
| --- | --- |
| `badge` and its three variants | Only the design-system page used it. The facts it was built for are a definition row; a caveat is a notice. |
| `callout`, `code-block` | Only the design-system page used them. The notice replaced the callout; a code block is a `pre` in prose. |
| `hazard` stripe | `display: none` in the shipped identity, so it rendered nothing anywhere. |
| `btn-secondary`, `btn-ghost`, `btn-text`, `btn-sm`, `btn-lg`, `btn-block` | No page used any of them. One action per page means one button. |
| `repo-line` | The repository index is a table now. |
| `sg-table` | A prose table and a data table are the same component. |
| `cast-single` | A workbench-only grid override living in the site stylesheet. The story sets its own width. |
| `--nebula`, `--plum`, `--decal-*` | Declared and never read; the chip and film tokens replaced the decal pair. |

## Identities

Three identities live in `tokens.css`, switched by `data-lab` on `<html>`: `c` shipped, `a` instrument, `b` poster. No page sets the attribute, so the workbench toolbar is the only place they are compared and `/style/` is where they are documented. An identity is one block of tokens plus one scoped block of rules at the end of `notebook.css`.
