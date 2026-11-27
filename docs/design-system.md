# Superposition design system

The site is one dark surface, warm cream type, and a palette with two families. The ground, the cream and the content accents are sampled from the NASA photographs the site shows; the amber, the cyan and the red are the instrument light of the genre it speaks in — late-70s and early-80s space opera — and they carry the chrome, never the content. `assets/tokens.css` is the only place a colour, typeface, size, space or motion value is defined; `assets/notebook.css` builds components from those tokens; `/style/` renders both live.

## Colour

### Sampled

Each value was sampled from the imagery, not chosen.

| Token | Value | Comes from |
|---|---|---|
| `--void` | `#000000` | absolute black: the page contributes no light, so a photograph on it can only add light |
| `--void-rgb` | `0, 0, 0` | the same ground as channels, so the hero scrim can follow it |
| `--rim` | accent at 5.5%, radial at 50% −18% | one warm rim at the top of the page: light from above the screen |
| `--panel` | `--deep` → `--void`, 180° | blocks and callouts are a gradient, never one flat fill |
| `--deep` | `#131118` | Deep Field ground, `#13141b`–`#201a1e` |
| `--surface` | `#1c1a20` | Deep Field, one step up from the ground |
| `--line` | `rgba(242,230,216,.14)` | starlight at hairline weight |
| `--nebula` | `#5474a8` | Carina nebula blue `#394d79` lifted |
| `--nebula-text` | `#6f93c9` | the same blue where it is prose text |
| `--plum` | `#6b3f4d` | Carina plum-brown `#3b272e` lifted |
| `--plum-mark` | `#9a5e72` | the plum lifted to edge contrast |

### Emitted

Not sampled from anything on the site. These are the light of a control panel in a 90s frame: warm, bright, and always on a near-black ground. They arrived with the Network series — the cast drawings in `assets/series/` — and they are now the chrome of the whole site: the same values light the masthead, an ident line, a gauge rail and the tick on a figure.

| Token | Value | Job |
|---|---|---|
| `--amber` | `#ffc24a` | the signal: chrome links, the wordmark, gauge bars, HUD ticks, idents, cast names |
| `--cyan` | `#8fd3ff` | the second signal; state and focus |
| `--cream` | `#e6dcc8` | body type; series display type |
| `--alert` | `#e2402f` | one alert on the whole site. Marks and edges only; 4.1:1 on `--surface` |
| `--alert-text` | `#f4735f` | the same alert where it is small type, 6.1:1 on `--surface` |
| `--accent`, `--accent-text` | `var(--amber)` | the semantic name a component uses for the accent |
| `--accent-peak` | `#ffd966` | amber at its peak, hover only |
| `--accent-warm` | `#e98e5b` | amber warming out, stamps and secondary marks |
| `--state`, `--state-text` | `var(--cyan)` / `#a9dcff` | state edges and state type |
| `--star` | `#efe6d3` | warm cream for headings — never a clipped white |
| `--starlight` | `var(--cream)` | warm cream for body and secondary text (14.5:1) |
| `--dust` | `#a99884` | warm grey for meta, captions, stamps |

The five emitted values are the source; `--accent`, `--accent-text`, `--state`, `--state-text`, `--starlight` are aliases onto them. A new series drawing, a new component and a new identity all read the same five.

### The rule

- **Text** is `--star`, `--starlight`, or `--dust`. Nothing else carries body copy.
- **`--accent-text`** is the site accent: chrome links, the wordmark, gauge bars, HUD ticks, entry titles.
- **`--nebula-text`** is the prose link colour only, so a link inside an article reads as a different thing from a link in the chrome. It is sampled, which keeps the writing in the photographs' own colour while the chrome is emitted light.
- **`--state`** is focus rings and state edges; `--state-text` where that state is written.
- **`--alert`** appears exactly once on the site: the 404. Red is 4.7:1 on the ground and 4.1:1 on a raised block, so it is an edge, or text on the ground, or `--alert-text` (7.0:1) on a block.
- **`--plum-mark`** never carries body text. It fills the blockquote edge.
- **`--amber`**, **`--cyan`** and **`--cream`** name the light itself, for the series drawings and the chrome. A component names its job — `--accent-text`, `--state` — and not its colour, so an identity can move the light without touching a rule.
- **Never** introduce a colour that is not in `tokens.css`. The contrast block at the top of that file carries every measured pair; `/style/` prints the same numbers beside each swatch; `storybook/scripts/contrast.mjs` prints every pair over all three identities and exits non-zero on a failure.

## Type

| Token | Value | Use |
|---|---|---|
| `--font-display` | Anton (self-hosted, OFL) | h1, h2, the wordmark, section titles, decals in the instrument identity |
| `--font-text` | Iowan Old Style / Palatino / Georgia (system serif) | body copy, lede |
| `--font-mono` | IBM Plex Mono 400/500/600 (self-hosted, OFL, subset to Latin) | nav, meta, kickers, captions, code, dates |

The instrument identity sets `--font-text` to the mono face as well, so everything a machine says — and in that identity, everything — is mono. The poster identity sets it to a system sans.

| Step | Value | Use |
|---|---|---|
| `--step-hero` | `clamp(48px, 10.4vw, 150px)` | the home wordmark |
| `--step-5` | `clamp(28px, 4.4vw, 44px)` | page and entry h1 |
| `--step-4` | `clamp(19px, 2vw, 22px)` | lede, section titles, prose h2 |
| `--step-3` | `17px` | body |
| `--step-2` | `15px` | entry lines |
| `--step-1` | `13px` | meta, captions, buttons |
| `--step-decal` | `11px` | decal eyebrows |

Line height is `--leading-body` (1.7) for prose and `--leading-tight` (1.1) for display sizes. Measures are `--measure` (64ch) for prose, `--measure-narrow` (46ch) for lede text, `--max-crawl` (56ch) for the crawl.

Tracking is three tokens: `--track-label` (.10em, .16em instrument, .20em poster) for uppercase labels, `--track-display` (−.01em) for display type, `--track-hero` (.04em) for the wordmark. Display names are uppercase; a repository's own name and an entry's own title keep the case they were written with.

## Space, edges and motion

`--space-1` … `--space-6` run 6px, 12px, 20px, 32px, `clamp(40px,5.4vw,72px)`, `clamp(56px,8vw,112px)`. `--radius` is 0 and `--border-hair` is the one hairline. The single exception is `--radius-decal` (3px), because a hardware label is a physical chip.

`--hud-tick` (14px) and `--hud-weight` (1px) size the corner ticks. `--rail-bar` (3px), `--rail-pitch` (10px) and `--rail-cap` (1.5px) size the gauge rail; `--rail` is its colour.

Motion is one thing: the home page's opening statement drifts 26px up and back over `--dur-crawl` (52s, 64s in the poster identity, none in the instrument identity), inside a frame whose edges fade. `--dur-slow` (24s) is the hero photograph's drift, and only the instrument identity uses it. `.crawl .lede` stops on the page's own Hold switch — a checkbox, so it is CSS-only and is the pause mechanism WCAG 2.2.2 asks for — and `prefers-reduced-motion: reduce` removes the motion, the tilt and the fade together.

## Components

`notebook.css` builds these over the tokens, one section per component:

| Component | Classes | Where it ships |
|---|---|---|
| Shell | `wrap`, `wide`, `skip`, `visually-hidden` | every page |
| Nav | `site-header`, `home-link` | every page |
| Hero | `hero`, `hero-inner`, `starfield` | the home page |
| Crawl | `crawl`, `crawl-switch`, `crawl-hold` | the home page |
| Type | `lede`, `section-title`, `kicker`, `decal`, `meta` | everywhere |
| HUD frame | `.figure`, `.card`, `.callout`, `.audio`, `.empty-state` corner ticks | prose, `/projects/` |
| Alert | `alert` | the 404 |
| Warning stripe | `hazard` | the home page, instrument identity only |
| Link | `text-link`, prose links | chrome and prose |
| Button | `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-text`, `btn-sm`, `btn-lg`, `btn-block` | `/style/`; ready for actions |
| Badge | `badge`, `badge-accent`, `badge-state`, `badge-solid` | `/style/`; topics and states |
| Topic row | `topic-list`, `dot`, `dot-accent` … `dot-dust` | home, `/topics/` |
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

`/style/` shows every one of them rendered live, which is the test that they are applied rather than described. The Storybook workbench in `storybook/` imports the same two stylesheets, has an identity switcher in its toolbar (it sets `data-lab` on the root element, in workbench code only), and adds the variants and states a page does not happen to be showing. `storybook/scripts/contrast.mjs` measures all 120 colour pairs over the three identities, and `/style/` prints the same numbers beside each swatch.

**Never** add a component style to a Storybook-only file. A story that needs a new rule is a rule missing from `notebook.css`, and that is where it goes.

## Identities

Three identities live in the same two stylesheets, switched by `data-lab` on `<html>`: `c` (shipped, the default), `a` (instrument), `b` (poster). Each is a block of tokens plus a scoped block at the end of `notebook.css`; no component is duplicated and no markup changes.

| | `c` shipped | `a` instrument | `b` poster |
|---|---|---|---|
| Ground | `#0b0a0d` | `#0a0a0b` | `#050508` |
| Accent | amber 12.3:1 | amber 12.3:1 | cyan 12.5:1 |
| State | cyan 12.2:1 | cyan 12.2:1 | cyan 16.0:1 |
| Display | Anton caps | mono, tracked | Anton caps, wide |
| Body | system serif | Plex Mono | system sans |
| Photograph | full strength, grain, vignette | 16% of a sensor feed | 13% nebula under a star field |
| Motion | the crawl | the feed drift | the crawl, tilted |
| Glow | soft | strong | none |
| Decal | mono chip | condensed chip | plain label |

`b` measured 2.0:1 for the wordmark before the star field was dimmed behind the copy; the radial in `.hero::after` now leaves the brightest pixel behind a letter at 5.98:1 at 420 and 9.53:1 at 1440. That is the kind of thing only a render catches.

## Adding a page

Use `layout: default` and start with `<div class="wrap">`. Use `wide` for anything that needs the 1200px measure (the hero, image plates). Never set a colour, font size or margin outside the tokens. If an eyebrow wants the decal chip, use `<span class="decal">`; if a block wants the HUD frame, it already has it — the frame is attached to `.figure`, `.card`, `.callout`, `.audio` and `.empty-state`, not to a new class.
