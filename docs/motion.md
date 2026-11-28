# Motion

The site moves with GSAP, self-hosted under `assets/vendor/gsap/`, behind one
runtime in `assets/motion.js`. This file is the spec: what a page may animate,
with what, and how it is allowed to fail.

Motion is a presentation layer over static HTML. It is never the only way to
read something, it never changes what a page says, and it never runs for a
reader who has asked it not to.

## The rule

A page may animate a sequence only when the sequence **presents information**:

- a **progression** — the repository ladder going from 0.94 s to 0.07 s, a
  reading position advancing through an entry, a station shuttle docking;
- a **comparison** — six versions of the same program drawn to their measured
  times;
- a **reveal of something already true** — the hero's photograph, wordmark and
  statement arriving in the order they are read.

It may not animate to fill time, to decorate a hover, or to hold the reader in
place. That rules out: spinning logos, bouncing buttons, background loops,
scroll-jacking, a scene that pins more than one viewport, and any autoplay that
runs past five seconds without a control to stop it. A page with nothing to
present loads no scripts at all — which is every page except the home page, the
repository pages and the entries.

## The vocabulary

Every value is in `assets/tokens.css`. The runtime reads these by name, so a
transformation in JavaScript and a rule in CSS cannot drift apart.

```
--ease-move         cubic-bezier(.22, .61, .36, 1)   one curve, everywhere
--dur-quick         160ms    a reading the reader caused: the progress rail
--dur-rise          420ms    one element arriving in place
--dur-settle        720ms    a short lifted sequence
--dur-scene         900ms    the longest single step a scene may take
--stagger-step      70ms     between neighbours: rows, stills, letters
--rise-distance     18px     how far an element travels when it arrives
--scene-pin         100svh   the scroll a pinned scene is held for
--rail-height       2px      the reading rail on an entry
```

One curve, one family of durations, four distances. There is no second ease,
no bounce, no elastic, and no per-page hand-tuning: if a sequence needs a
number that is not here, the number is the thing to review.

Under `prefers-reduced-motion: reduce` every duration goes to zero in
`tokens.css` and the runtime does not register anything at all.

## Behaviours

A page opts in with `motion:` in its front matter (see the table at the end).
The markup then names a behaviour on an element with `data-motion`, and one
behaviour may cover a whole page:

| `data-motion` | Where | What it does |
| --- | --- | --- |
| `opening` | home, on the `.hero-scene` wrapper | Pins the hero for one viewport and scrubs: the photograph steps back, the statement settles out of its crawl, the wordmark resolves letter by letter, the standfirst rises, then the hero releases into the page. Every start state is legible — the statement at 35% and the standfirst at 40% — so the first screen reads before it moves. Reversible; the reader's scroll is the clock. |
| `reveal` | repository pages, on `.repo-page`; the home page's plates; an entry's prose | Blocks arrive as they are reached: the eyebrow, the title out of its own box, the standfirst, the definition rows in sequence, then every figure and aside on the page, each on its own trigger. Numbers carrying `data-count` count up to the value already printed. |
| `poster` | any campaign poster, from `_includes/campaign/poster.html` | The still arrives, then the number, the genre, the title assembling under it, the film line, the logline and the credit — the order a poster is read. |
| `rail` | an entry, on `.entry-page` | The reading rail fills as the entry is read. The rail exists in the markup, is drawn only while a scene runs, and is decorative. |
| `figure` | `_repos/1brc-cpp.md`, on its ladder figure | The bars grow out of nothing and the times count up to themselves. The bars are drawn at their real widths and the times printed in the HTML, so the scene only animates between two true states. |
| `grow` | a flora drawing, when its page lands | See the contract below. |
| `station` | the station scene, when its page lands | See the contract below. |

Block markers inside a `reveal` scope:

- `data-reveal` — the element arrives (fades and rises `--rise-distance`).
- `data-reveal="wipe"` — it rises out of its own box, for a title.
- `data-reveal="list"` — its children arrive in sequence.
- `data-count="123"` — the number printed there counts up to itself.

Nothing in a markdown file needs to be marked: a `figure` or an `aside` in a
`reveal` or `rail` scope arrives on its own. Content authors add no attributes.

## The guard

Four states, and only one of them moves:

| State | What happens |
| --- | --- |
| JavaScript off, or the vendor build missing | The boot snippet's class is removed by its own timer after 1.5 s, `motion.js` returns at its first check, and the page is the static page. |
| `prefers-reduced-motion: reduce` | The boot snippet refuses to mark the first frame, `motion.js` returns before registering a plugin, and `document.getAnimations()` stays empty. |
| Motion on, script fails after the first frame | The runtime never sets `html.motion`, the timer removes `motion-boot`, and the page renders as it does without JavaScript. |
| Motion on | Behaviours run. |

The only thing hidden for a first frame is hidden by
`html.motion-boot ... { opacity: 0 }` in `assets/notebook.css`, set by the
snippet in `_includes/motion.html` and removed by the runtime before it builds
its first tween. Nothing in the HTML is hidden, and nothing depends on a script
running to become readable.

A reader who turns reduced motion on while reading gets the static page: the
runtime removes `html.motion` and reloads once, and the next load takes the
first check above.

A scene is built when its block reaches the screen, and its start state does not
exist before then: the animation is created at that moment rather than parked in
a hidden state. A block that is never reached — a trigger that never fires, a
resize that moves it — stays exactly as the HTML drew it, so a page can lose its
motion but never its content.

Pinning is the one thing that takes the scroll, and it takes exactly one
viewport of it, once, at the top of one page. The hero is held by ScrollTrigger
(a spacer of the same height and a fixed hero), not by a full-screen overlay, so
the document keeps its own height, focus order and anchor positions; a reader who
jumps to `#content` lands there, and the pin releases at the end of its viewport
whether the reader scrolled fast or slow.

## The budget

Measured gzipped, per page:

| Page | GSAP | ScrollTrigger | SplitText | `motion.js` | Total |
| --- | --- | --- | --- | --- | --- |
| Home | 28.4 KB | 18.0 KB | 3.7 KB | 6.6 KB | **56.7 KB** |
| Repository page | 28.4 KB | 18.0 KB | — | 6.6 KB | **53.0 KB** |
| Entry | 28.4 KB | 18.0 KB | — | 6.6 KB | **53.0 KB** |
| Every other page | — | — | — | — | **0** |

The ceiling is 80 KB gzipped per page. A sequence that would push past it is cut,
never the guard: the guard is what makes the rest of this file honest.

Measured on the built site with headless Chrome 143 at 1440, 420 and 360, every
page that carries motion: no horizontal overflow, no console error or warning,
no failed request and no third-party request, and cumulative layout shift
0.0000 at every width — including the home page, where the pin's spacer is
inserted after load.

## Contracts for the pages being built beside this one

Two pages are being drawn in parallel threads. Each has agreed data attributes
so the runtime can animate them without being edited when they land.

### The station scene

```html
<div data-motion="station">
  <svg viewBox="0 0 2400 1500">
    <g data-layer="city">…</g>
    <g data-layer="station">…</g>
    <g data-layer="traffic">…</g>
    <g data-shuttle>…</g>
    <circle data-marker="dock-a" r="0"></circle>
    <circle data-marker="dock-b" r="0"></circle>
    <g data-signal>…</g>
  </svg>
</div>
```

- `data-layer` on a layer wrapper, with an optional `data-depth` in percent
  (defaults: city −6, station −14, traffic −22). Each layer drifts against the
  others as the scene crosses the viewport, which is what says which is further
  away. Negative depth recedes.
- `data-shuttle` with two empty markers, `data-marker="dock-a"` and
  `data-marker="dock-b"`, placed where the shuttle starts and where it docks.
  The shuttle is tweened between them, scrubbed by the scroll: the path is the
  drawing's, not a number chosen in JavaScript.
- `data-signal` pulses four times when it comes into view and rests off-screen.
  Four cycles is under five seconds, which is why it needs no pause control.

The layer wrappers stay in the SVG's own coordinate space: the runtime moves
them with `yPercent`, so a layer must not be shorter than the scene or its drift
will show an edge.

### A flora drawing

```html
<svg viewBox="0 0 400 600">
  <g id="stem">…paths…</g>
  <g id="leaves"><g data-grow>…</g></g>
  <g id="bud"><g data-grow>…</g></g>
  <g id="petals"><g data-bloom>…</g></g>
  <g id="spores"><g data-bloom>…</g></g>
</svg>
```

wrapped in an element with `data-motion="grow"`:

- every `path` in `#stem` draws along its own length, in order of appearance;
- `data-grow` on a leaf or a bud scales it up from its own attachment point —
  `data-origin` overrides the default `50% 100%`;
- `data-bloom` in `#petals` opens the petals in sequence, and `data-bloom` in
  `#spores` drifts the spores up into place.

A drawing that carries none of these attributes is untouched and simply shows.

## Opting a page in

```yaml
motion: opening   # the home page only
motion: reveal    # repository pages (set in _config.yml for the collection)
motion: rail      # entries (set in _config.yml for posts)
motion: figure    # a page that presents a measured figure
```

`_config.yml` sets `reveal` for every repository page and `rail` for every
entry, so a new entry or a new repository page gets motion without being asked.
No other page has it: adding it is a decision about what a page presents, and
the runtime's behaviours are the only vocabulary available to it.
