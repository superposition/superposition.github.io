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

The Network — the series cast — has its own five tokens. They are not sampled from a photograph: they are the emitted light the characters are drawn in, on the dark metal of the page.

| Token | Value | Use |
|---|---|---|
| `--amber` | `#ffc24a` | the series signal: idents, masthead rule, cast names on hover |
| `--cyan` | `#8fd3ff` | the second signal; a cast unit's own colour |
| `--cream` | `#e6dcc8` | the series body: display type on the masthead and cast names |
| `--alert` | `#e2402f` | alerts. Marks and edges only; 4.1:1 on `--surface` |
| `--alert-text` | `#f4735f` | the same alert where it is small type, 6.1:1 on `--surface` |

Four accents are also defined in a text-safe form — `--rust-text`, `--nebula-text`, `--teal-text`, `--plum-mark` — because the sampled values do not all clear 4.5:1 for small text on the dark ground. The contrast block at the top of `tokens.css` carries every measured pair, and `/style/` prints the same numbers beside each swatch.

### The rule

- **Text** is `--star`, `--starlight`, or `--dust`. Nothing else.
- **`--rust-text`** is the site accent: links outside prose, the wordmark hover, current-page state.
- **`--nebula-text`** is the prose link colour only, so a link inside an article reads as a different thing from a link in the chrome.
- **`--teal`** is focus rings and state edges; `--teal-text` where that state is written.
- **`--plum`** never carries text. It fills the blockquote edge and the fifth topic dot (`--plum-mark` for the dot, which needs the lift).
- **Never** introduce a colour that is not in `tokens.css`. If an image brings a new one, sample it, measure it, and add it to the token file with the measurement.
- **`--amber`**, **`--cyan`** and **`--cream`** are the series chrome and nothing else. They appear on `/series/` (the masthead, the cast cards, the idents) and in `assets/series/*.svg` as the drawings' light. They are not a second site accent: a link outside prose is still `--rust-text`.

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

`notebook.css` builds these over the tokens, one section per component:

| Component | Classes | Where it ships |
|---|---|---|
| Shell | `wrap`, `wide`, `skip`, `visually-hidden` | every page |
| Nav | `site-header`, `home-link` | every page |
| Hero | `hero`, `hero-inner` | the home page |
| Type | `lede`, `section-title`, `kicker`, `meta` | everywhere |
| Link | `text-link`, prose links | chrome and prose |
| Button | `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-text`, `btn-sm`, `btn-lg`, `btn-block` | `/style/`; ready for actions |
| Badge | `badge`, `badge-accent`, `badge-state`, `badge-solid` | `/style/`; topics and states |
| Topic row | `topic-list`, `dot`, `dot-rust` … `dot-dust` | home, `/topics/` |
| Card | `card`, `card-media`, `card-kicker`, `card-title`, `card-text`, `card-meta`, `card-foot`, `repo-grid` | `/projects/` |
| Entry list | `entry-list`, `entry`, `entry-date`, `entry-title`, `entry-dek` | home, `/journal/` |
| Figure | `figure` + caption, `code-block` | prose and repository pages |
| Prose | `prose`, `callout`, `callout-title` | entries, repository pages, About, credits |
| Empty state | `empty-state`, `empty-title`, `empty-text` | `/journal/`, `/projects/` |
| Footer | `site-footer` | every page |
| Series masthead | `network`, `network-bug`, `network-title` | `/series/` |
| Cast card | `cast`, `cast-card`, `cast-portrait`, `cast-unit`, `cast-name`, `cast-role`, `cast-front`, `cast-voice` | `/series/`, Storybook |
| Ident | `ident-list`, `ident`, `ident-who`, `ident-line` | `/series/` |

The cast's four portraits are hand-authored SVG in `assets/series/`, one file per character, each with its own `title` and `role`, and no raster or external reference anywhere in them. `_data/cast.yml` is the cast: name, role, the line the unit says, the library it fronts, and the tokens it is drawn in.

`/style/` shows every one of them rendered live, which is the test that they are applied rather than described. The Storybook workbench in `storybook/` imports the same two stylesheets and adds the variants and states a page does not happen to be showing; `storybook/scripts/contrast.mjs` measures all 38 colour pairs the components ship, and `/style/` prints the same numbers beside each swatch.

**Never** add a component style to a Storybook-only file. A story that needs a new rule is a rule missing from `notebook.css`, and that is where it goes.

## Adding a page

Use `layout: default` and start with `<div class="wrap">`. Use `wide` for anything that needs the 1200px measure (the hero, image plates). Never set a colour, font size or margin outside the tokens.
