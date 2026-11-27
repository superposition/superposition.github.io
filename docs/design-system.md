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
| `--step-4` | `clamp(19px, 2vw, 22px)` | lede, section titles |
| `--step-3` | `19px` | body |
| `--step-2` | `15px` | entry lines |
| `--step-1` | `13px` | meta, captions, buttons |
| `--step-decal` | `11px` | decal eyebrows |

Line height is `--leading-body` (1.6) for prose and `--leading-tight` (1.1) for display sizes. Measures are `--measure` (34rem, 544px) for prose, `--measure-narrow` (30rem) for lede text, `--max-crawl` (56ch) for the crawl.

A prose section heading is not display type. `h2` in prose is the label voice — IBM Plex Mono 600 at `--step-1`, uppercase, `--track-label`, in `--star` on the hairline — one rung above the `h3` that sits in the same voice at `--starlight`. Anton starts at `--step-4` and is the name a page is called by, not a heading inside a column: at 22px in a 544px column the condensed face reads as a shout at text size, and it overhangs nothing only because every block now shares one measure.

Tracking is three tokens: `--track-label` (.10em, .16em instrument, .20em poster) for uppercase labels, `--track-display` (−.01em) for display type, `--track-hero` (.04em) for the wordmark. Display names are uppercase; a repository's own name and an entry's own title keep the case they were written with.

## Space, edges and motion

`--space-1` … `--space-6` run 6px, 12px, 20px, 32px, `clamp(40px,5.4vw,72px)`, `clamp(56px,8vw,112px)`. Those size the inside of a component. Three named roles size the gaps between them, so a break of one kind is one number: `--flow` (`calc(var(--step-3) * 1.25)`, 23.75px) between blocks of prose, `--space-section` (`clamp(40px,5.4vw,72px)`) between the sections of a page, `--space-open` (`clamp(56px,8vw,112px)`) between the nav and the page's first line and again before the footer. `--radius` is 0 and `--border-hair` is the one hairline. The single exception is `--radius-decal` (3px), because a hardware label is a physical chip.

`--hud-tick` (14px) and `--hud-weight` (1px) size the corner ticks. `--rail-bar` (3px), `--rail-pitch` (10px) and `--rail-cap` (1.5px) size the gauge rail; `--rail` is its colour.

Motion is one thing: the home page's opening statement drifts 26px up and back over `--dur-crawl` (52s, 64s in the poster identity, none in the instrument identity), inside a frame whose edges fade. `--dur-slow` (24s) is the hero photograph's drift, and only the instrument identity uses it. `.crawl .lede` stops on the page's own Hold switch — a checkbox, so it is CSS-only and is the pause mechanism WCAG 2.2.2 asks for — and `prefers-reduced-motion: reduce` removes the motion, the tilt and the fade together.

The second family is the answer to a pointer or a key. Four readings, all CSS, none of them changing geometry — each is a `color`, `border-color`, `box-shadow`, `opacity` or `transform` change, so no state reflows a line:

| Token | Value | Use |
|---|---|---|
| `--dur-sweep` | `200ms` | the hairline that draws under a command |
| `--dur-state` | `140ms` | colour on a link; a button's fill, edge and bloom |
| `--dur-glide` | `340ms` | the 2% growth of a card thumbnail |
| `--ease-out` | `cubic-bezier(.2,.55,.25,1)` | every state reading |

**Commands sweep, references underline.** The wordmark, nav links, topic links, card titles and the entry and repository rows carry a 1px hairline in `currentColor`, scaled from 0 to full width out of the left edge on hover, on `:focus-visible` and on `[aria-current]` — so the page you are on and the row the keyboard is on read like the row under the pointer. It is a `transform` on a pseudo-element, so it composites and takes whatever colour the identity sets the link in. Prose links and `.text-link` are references: they keep a resting rule and thicken from 1px to 2px.

A link that can wrap is not a command. `.repo-list` was the one that proved it: its links fragment into two to four line boxes (19 of 20 at 1440, 20 of 20 at 420) and a pseudo-element hairline lands under the first line only, so those links underline on hover instead. Any new link that can wrap belongs with them.

**Buttons fade, and press instantly.** `.btn` fades its fill, edge and bloom over `--dur-state`; the 1px `:active` press has no transition on purpose — a press that eases reads as lag.

**Pictures develop.** The image inside `.prose figure`, `.plate` and `.cast-portrait` fades 0→1 over the first 25% of its own entry into the viewport, on its `view()` timeline. The caption never fades: a caption is text and keeps the contrast it was measured at. A browser without scroll-driven animations shows the picture at once, with nothing hidden behind a class or a script.

**The card thumbnail grows** 2% under the pointer, inside the card's own 10px padding, so the HUD frame never clips it.

### Reduced motion

Both families stop, in the two places they are declared:

- `tokens.css` zeroes `--dur-sweep`, `--dur-state` and `--dur-glide`, so every state still arrives — at once, with no fade to follow.
- `notebook.css` stops the moves, which have no duration to zero: the crawl loses its motion, tilt and fade, and its Hold switch goes with them; the hero drift stops; the picture reveal is dropped and its images sit at full opacity; the thumbnail does not grow.


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
| Poster | `poster`, `poster--still`, `poster--field`, `poster--text`, `poster-link`, `poster-art`, `poster-no`, `poster-figure`, `poster-body`, `poster-genre`, `poster-title`, `poster-film`, `poster-logline`, `poster-cast`, `poster-slate` | home strip, `/now-showing/`, every repository page |
| Campaign block | `campaign`, `campaign-poster`, `campaign-body`, `campaign-kicker`, `campaign-title`, `campaign-logline`, `campaign-voice`, `campaign-meta`, `campaign-stills` | `/projects/<slug>/` |
| Now-showing strip | `now-showing`, `now-showing-head`, `strip`, `strip-track`, `strip-item`, `strip-toggle`, `strip-pause` | home |

The cast's four portraits are hand-authored SVG in `assets/series/`, one file per character, each with its own `title` and `role`, and no raster or external reference anywhere in them. `_data/cast.yml` is the cast: name, role, the line the unit says, the library it fronts, and the tokens it is drawn in.

`/style/` shows every one of them rendered live, which is the test that they are applied rather than described. The Storybook workbench in `storybook/` imports the same two stylesheets, has an identity switcher in its toolbar (it sets `data-lab` on the root element, in workbench code only), and adds the variants and states a page does not happen to be showing. `storybook/scripts/contrast.mjs` measures all 120 colour pairs over the three identities, and `/style/` prints the same numbers beside each swatch.

**Never** add a component style to a Storybook-only file. A story that needs a new rule is a rule missing from `notebook.css`, and that is where it goes.

## Campaigns

Every repository is advertised as a film. The system is three components over one data file, and it reads the semantic tokens, so the three identities re-light it: the film line is `--accent-text`, the genre and labels `--state-text`, the title `--star`, the credits `--dust`. Only five values are the poster's own — `--poster-lamp`, `--poster-edge`, `--poster-wash`, `--poster-scrim`, `--poster-metal` — because a printed sheet needs a lamp, a scrim and a frame that the page does not.

| Where | What it renders |
|---|---|
| `/` | the now-showing strip: the programme in one row, stepped in CSS |
| `/projects/<slug>/` | the campaign block above the prose: poster, billing, the character's voice line, stills |
| `/now-showing/` | the programme as a three-up gallery of posters |

### The data

`_data/campaigns.yml` holds one record per repository page, in programme order. `slug` is the join and every record needs both a `_repos/<slug>.md` and five written fields: `title` (the library's own name, set as the film title), `film` (the film-style subtitle), `genre`, `runtime`, and a `logline` of twenty words or fewer. `cast` is the list of parts in the film, in billing order. `stills` is one to three images that already exist on the site — the repository's own figures, or NASA photography already licensed — and the first one is the key art.

`scripts/check-campaigns.mjs` enforces the shape: the slug join in both directions, the twenty-word logline, one to three stills, and every still present on disk with alt text and a credit. Run it before opening a pull request; it exits non-zero on any problem.

**Never** write a logline for a capability the repository does not claim on its own page. The poster may be a joke about the genre; the logline is the library's actual behaviour in twenty words.

### The cast

`_data/cast.yml` is the series cast, one member per library. A campaign is fronted by the member whose `library.slug` is its slug: their drawing is printed at the foot of the key art, and their `name` and `role` take the credit line. Their `voice` line is printed in the campaign block as the pull quote. A library with no member keeps its `cast` list as the credit; a member whose drawing is missing keeps only their name. Either way there is never a hole where a portrait would be.

### The poster

`.poster` is the frame: 2:3, `container-type: inline-size`, key art at the top on `--deep`, type below on `--void`. Because the type band is the void ground, a poster's contrast does not depend on which photograph happens to be behind it — and the key art is only ever behind the `poster-no` decal, which carries `--decal-bg` and `--decal-text` at 16.7:1.

Three variants: `poster--still` (a repository figure or a NASA photograph), `poster--field` (a ring, a warm core and a ruled grid drawn in gradients, for a repository with no figure), and `poster--text` (no art at all). The variant is chosen by whether the still's file is really in the build, so a renamed image falls back to the field rather than shipping a broken one.

Every type size and pad is a poster token measured in `cqi`, so the same component holds at 160px in the strip and at 420px on a repository page. Reprints carry less:

| Container width | Carries |
|---|---|
| over 340px | genre, title, film line, logline, cast credit, slate |
| 261–340px | drops the cast credit |
| 260px and under | drops the logline, and the type area grows to 58% of the frame |
| 11 characters or more in the title | `poster--long` sets the title on its own smaller step |

### The strip

The track holds the programme twice and translates to `-50%` in `steps()` equal to the number of campaigns, so the loop closes without a seam and without JavaScript. The second copy is `aria-hidden` and `inert`, because a screen reader should hear each campaign once and a keyboard should not have to tab through it twice. The pause control is the same drawn box and label the crawl uses — one control language on the home page — and it is the mechanism WCAG 2.2.2 asks for. Under `prefers-reduced-motion: reduce` the track does not move, the control is not rendered, and the row is still a scrollable, snap-aligned list.

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
