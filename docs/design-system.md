# Superposition design system

The site is one dark surface, cream type, and a palette sampled from the NASA photographs it shows. `assets/tokens.css` is the only place a colour, typeface, size, space or motion value is defined; `assets/notebook.css` builds components from those tokens; `/style/` renders both live.

## Colour

Each value was sampled from the imagery, not chosen.

| Token | Value | Comes from |
|---|---|---|
| `--void` | `#0b0a0d` | Deep Field shadow, Sombrero near-black |
| `--deep` | `#131118` | Deep Field ground, `#13141b`–`#201a1e` |
| `--surface` | `#1c1a20` | Deep Field, one step up from the ground |
| `--line` | `rgba(242,230,216,.14)` | starlight at hairline weight |
| `--star` | `#f7ecdd` | Andromeda and Whirlpool starlight |
| `--starlight` | `#cfc3b6` | starlight neutrals, `#979fa5`–`#8d8a80` lifted warm |
| `--dust` | `#a79085` | Carina dust |
| `--rust` | `#b8623f` | Carina rust `#8f503c` lifted |
| `--nebula` | `#5474a8` | Carina nebula blue `#394d79` lifted |
| `--teal` | `#2d7f96` | Sombrero deep blue `#194862` lifted |
| `--plum` | `#6b3f4d` | Carina plum-brown `#3b272e` lifted |

Four accents are also defined in a text-safe form — `--rust-text`, `--nebula-text`, `--teal-text`, `--plum-mark` — because the sampled values do not all clear 4.5:1 for small text on the dark ground. The contrast block at the top of `tokens.css` carries every measured pair, and `/style/` prints the same numbers beside each swatch.

### The rule

- **Text** is `--star`, `--starlight`, or `--dust`. Nothing else.
- **`--rust-text`** is the site accent: links outside prose, the wordmark hover, current-page state.
- **`--nebula-text`** is the prose link colour only, so a link inside an article reads as a different thing from a link in the chrome.
- **`--teal`** is focus rings and state edges; `--teal-text` where that state is written.
- **`--plum`** never carries text. It fills the blockquote edge and the fifth topic dot (`--plum-mark` for the dot, which needs the lift).
- **Never** introduce a colour that is not in `tokens.css`. If an image brings a new one, sample it, measure it, and add it to the token file with the measurement.

## Type

| Token | Value | Use |
|---|---|---|
| `--font-display` | Anton (self-hosted) | h1, h2, the wordmark |
| `--font-text` | Iowan Old Style / Palatino / Georgia (system serif) | body copy, lede |
| `--font-mono` | ui-monospace / SF Mono / Cascadia Mono (system) | nav, meta, kickers, captions, code |

| Step | Value | Use |
|---|---|---|
| `--step-hero` | `clamp(54px, 12vw, 168px)` | the home wordmark |
| `--step-5` | `clamp(28px, 4.4vw, 44px)` | page and entry h1 |
| `--step-4` | `clamp(19px, 2vw, 22px)` | lede, prose h2 |
| `--step-3` | `17px` | body |
| `--step-2` | `15px` | entry lines |
| `--step-1` | `13px` | meta, captions, buttons |

Line height is `--leading-body` (1.7) for prose and `--leading-tight` (1.1) for display sizes. Measures are `--measure` (64ch) for prose and `--measure-narrow` (46ch) for lede text.

## Space, edges and motion

`--space-1` … `--space-6` run 6px, 12px, 20px, 32px, `clamp(40px,5.4vw,72px)`, `clamp(56px,8vw,112px)`. There are no rounded corners: `--radius` is 0 and every border is the one hairline, `--border-hair`.

Motion is one thing: the hero photograph drifts from scale 1 to 1.06 over `--dur-slow` (24s), alternating, CSS only, and it stops entirely under `prefers-reduced-motion: reduce`. Nothing else on the site animates.

## Components

`notebook.css` builds these over the tokens: shell and gutters, nav, hero, headings, lede, prose (links, blockquote, code, table, figure and caption), topic row with a coloured dot, entry list, entry page, credits list, footer, focus states, and the 404. `/style/` shows each of them rendered live, which is the test that they are applied rather than described.

## Adding a page

Use `layout: default` and start with `<div class="wrap">`. Use `wide` for anything that needs the 1200px measure (the hero, image plates). Never set a colour, font size or margin outside the tokens.
