---
layout: default
title: Design system
permalink: /style/
description: Every token and component in the Superposition design system, rendered live.
sitemap: false
---
<div class="wrap">
  <header class="page-heading">
    <h1>Design system</h1>
    <p class="lede">Every token and component on the site, rendered from the same stylesheets the pages use. This page is the reference, and it is also enforced: <code>npm run slop</code> fails the build on a value written in <code>notebook.css</code> that is not a token, <code>npm run a11y</code> fails it on a missing state, a control under 24px or an image with no alt, and <code>npm run contrast</code> fails it on a pair under 4.5:1 for text or 3:1 for a control edge.</p>
  </header>

  <section class="sg-section" aria-labelledby="sg-rules">
    <h2 id="sg-rules">The rules the build keeps</h2>
    <div class="prose">
      <ol>
        <li><strong>Tokens or nothing.</strong> No colour, length, gradient, shadow, radius or font size is written in a component rule. The token file owns the values; this page and the workbench read the same two files the pages do.</li>
        <li><strong>Used or deleted.</strong> Every component names, in its story, the page that adopts it. A component with no live use is deleted rather than kept for later — buttons, callouts, badges and the hazard stripe went that way.</li>
        <li><strong>Real content.</strong> Every example here is the site's own copy: real repositories, real dates, real measurements. No placeholder titles, no $100.00.</li>
        <li><strong>States are real.</strong> Hover, focus-visible, active and disabled where a component can be unavailable; loading, empty and error where it shows data. The states below are live — hover them, tab to them.</li>
        <li><strong>One rhythm.</strong> Every gap is an 8px step with one documented half step. Two densities: comfortable for reading, compact for tables and the repository index.</li>
        <li><strong>Hierarchy before decoration.</strong> No card shadow, no gradient button, no centred-everything, no icon without a job. One accent: amber. State is cyan. Red is the 404 and a photograph that failed, and nothing else.</li>
        <li><strong>Accessibility is the definition.</strong> A 2px focus ring at a 4px offset, 24px targets, and measured contrast printed under each colour.</li>
      </ol>
    </div>
  </section>

  <section class="sg-section" aria-labelledby="sg-colour">
    <h2 id="sg-colour">Colour</h2>
    <p class="kicker">Measured on the void ground · the accessible pairs are printed by npm run contrast</p>
    <ul class="swatches">
      <li class="swatch"><div class="chip" style="background: var(--void)"></div><div class="label"><b>--void</b>#000000 · ground · 16.93:1 type</div></li>
      <li class="swatch"><div class="chip" style="background: var(--deep)"></div><div class="label"><b>--deep</b>#131118 · section ground</div></li>
      <li class="swatch"><div class="chip" style="background: var(--surface)"></div><div class="label"><b>--surface</b>#1c1a20 · raised block</div></li>
      <li class="swatch"><div class="chip" style="background: var(--panel)"></div><div class="label"><b>--panel</b>#131118 → #000000 · blocks, notices, code</div></li>
      <li class="swatch"><div class="chip" style="background: var(--star)"></div><div class="label"><b>--star</b>#efe6d3 · 16.93:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--starlight)"></div><div class="label"><b>--starlight</b>#e6dcc8 · 15.44:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--dust)"></div><div class="label"><b>--dust</b>#a99884 · 7.51:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent)"></div><div class="label"><b>--accent</b>#ffc24a · 13.07:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent-peak)"></div><div class="label"><b>--accent-peak</b>#ffd966 · 15.37:1 · hover</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent-warm)"></div><div class="label"><b>--accent-warm</b>#e98e5b · the instrument's log stamp</div></li>
      <li class="swatch"><div class="chip" style="background: var(--state)"></div><div class="label"><b>--state</b>#8fd3ff · 12.93:1 · focus and state</div></li>
      <li class="swatch"><div class="chip" style="background: var(--state-text)"></div><div class="label"><b>--state-text</b>#a9dcff · 14.37:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--alert)"></div><div class="label"><b>--alert</b>#e2402f · 5.01:1 · edge only</div></li>
      <li class="swatch"><div class="chip" style="background: var(--alert-text)"></div><div class="label"><b>--alert-text</b>#f4735f · 7.46:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--nebula-text)"></div><div class="label"><b>--nebula-text</b>#6f93c9 · 6.69:1 · prose links</div></li>
      <li class="swatch"><div class="chip" style="background: var(--plum-mark)"></div><div class="label"><b>--plum-mark</b>#9a5e72 · 4.22:1 as an edge</div></li>
      <li class="swatch"><div class="chip" style="background: var(--flora-bloom)"></div><div class="label"><b>--flora-bloom</b>#ff8fa3 · 9.71:1 · every petal</div></li>
      <li class="swatch"><div class="chip" style="background: var(--flora-spore)"></div><div class="label"><b>--flora-spore</b>#9fe870 · 14.25:1 · spores and the capsule</div></li>
      <li class="swatch"><div class="chip" style="background: var(--flora-leaf)"></div><div class="label"><b>--flora-leaf</b>#2f6b52 · 3.35:1 · a leaf fill, never an edge</div></li>
      <li class="swatch"><div class="chip" style="background: var(--chip-bg)"></div><div class="label"><b>--chip-bg</b>rgba(58,52,44,.92) · the chip film</div></li>
      <li class="swatch"><div class="chip" style="background: var(--chip-text)"></div><div class="label"><b>--chip-text</b>#efe6d3 · 10.55:1 on the film</div></li>
      <li class="swatch"><div class="chip" style="background: var(--film-bg)"></div><div class="label"><b>--film-bg</b>rgba(0,0,0,.88) · the release plate</div></li>
      <li class="swatch"><div class="chip" style="background: var(--line)"></div><div class="label"><b>--line</b>cream at 14% · the one hairline</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-lamp)"></div><div class="label"><b>--poster-lamp</b>· the lamp on dark metal</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-edge)"></div><div class="label"><b>--poster-edge</b>· a lit edge under the art</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-metal)"></div><div class="label"><b>--poster-metal</b>· the poster frame</div></li>
    </ul>
  </section>

  <section class="sg-section" aria-labelledby="sg-type">
    <h2 id="sg-type">Type</h2>
    <p class="kicker">The closed set · a size the site needs that is not here becomes a step in tokens.css, never a number in a component</p>
    <div class="scale-row"><span class="name">--step-hero</span><span style="font: var(--step-hero)/.92 var(--font-display); text-transform: uppercase; letter-spacing: var(--track-hero)">Superposition</span></div>
    <div class="scale-row"><span class="name">--step-5</span><span style="font: var(--step-5)/1.1 var(--font-display); text-transform: uppercase">Repositories</span></div>
    <div class="scale-row"><span class="name">--step-4</span><span style="font: var(--step-4)/1.2 var(--font-display); text-transform: uppercase">Recent entries</span></div>
    <div class="scale-row"><span class="name">--step-3</span><span style="font-size: var(--step-3); line-height: var(--leading-body)">A change of basis is not a change of the map.</span></div>
    <div class="scale-row"><span class="name">--step-2</span><span style="font-size: var(--step-2); line-height: 1.7">bend-ml-lab — Einsum, training epochs and weight diagnostics</span></div>
    <div class="scale-row"><span class="name">--step-1</span><span style="font-size: var(--step-1); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: var(--track-label)">Meta, mono, tracked</span></div>
    <div class="scale-row"><span class="name">--step-decal</span><span class="decal">Repository</span></div>
    <div class="scale-row"><span class="name">--step-header</span><span style="font-size: var(--step-header); font-family: var(--font-mono); text-transform: uppercase">The narrow header · 10.5px, measured: 11px misses the row at 360</span></div>
  </section>

  <section class="sg-section" aria-labelledby="sg-space">
    <h2 id="sg-space">Space</h2>
    <p class="kicker">The 8px rhythm, one documented half step</p>
    <table class="table table--compact">
      <caption>The scale, and what each step is for</caption>
      <thead><tr><th scope="col">Token</th><th scope="col" class="num">Value</th><th scope="col">Used for</th></tr></thead>
      <tbody>
        <tr><td><code>--space-half</code></td><td class="num">4px</td><td>The documented half step: a label over its value, a link's block padding</td></tr>
        <tr><td><code>--space-1</code></td><td class="num">8px</td><td>A row's block padding, the gap inside a line</td></tr>
        <tr><td><code>--space-2</code></td><td class="num">12px</td><td>A block's padding, a card's inner edge, the compact row</td></tr>
        <tr><td><code>--space-3</code></td><td class="num">16px</td><td>Between columns, the inside of a panel</td></tr>
        <tr><td><code>--space-4</code></td><td class="num">24px</td><td><code>--flow</code>: the paragraph break, a grid gutter</td></tr>
        <tr><td><code>--space-5</code></td><td class="num">32px</td><td>Around a figure, between a campaign's blocks</td></tr>
        <tr><td><code>--space-6</code></td><td class="num">48–80px</td><td>Between sections in a long page</td></tr>
        <tr><td><code>--space-section</code></td><td class="num">40–72px</td><td>One section from the next</td></tr>
        <tr><td><code>--space-open</code></td><td class="num">56–112px</td><td>The opening above a page heading, the footer</td></tr>
      </tbody>
    </table>
  </section>

  <section class="sg-section" aria-labelledby="sg-parts">
    <h2 id="sg-parts">Components</h2>

    <div class="sg-example">
      <p class="kicker">Topic row · the home page</p>
      <ul class="topic-list" aria-label="Topics">
        <li><span class="dot" aria-hidden="true"></span><a href="#sg-parts">Data informatics</a></li>
        <li><span class="dot" aria-hidden="true"></span><a href="#sg-parts">AI</a></li>
        <li><span class="dot" aria-hidden="true"></span><a href="#sg-parts">Matrices</a></li>
        <li><span class="dot" aria-hidden="true"></span><a href="#sg-parts">Kinematics</a></li>
        <li><span class="dot" aria-hidden="true"></span><a href="#sg-parts">Cryptographic proofs</a></li>
      </ul>
      <p class="meta">One dot, one colour: the five topics have no fixed colour anywhere else, and the photographs supply the site's colour.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Entry list · /journal/ and the home page</p>
      <ul class="entry-list">
        <li><a class="entry" href="#sg-parts"><span class="entry-date"><time datetime="2026-11-20">2026-11-20</time></span><span class="entry-title">Example — what a matrix does to a basis</span><span class="entry-dek">A change of basis, read as a statement about where the arrows go.</span></a></li>
        <li><a class="entry" href="#sg-parts"><span class="entry-date"><time datetime="2026-11-21">2026-11-21</time></span><span class="entry-title">Example — motion in one frame and another</span><span class="entry-dek">Position is easy to write and hard to mean.</span></a></li>
      </ul>
      <p class="kicker">The three rows above are the three draft entries in <code>_drafts/</code>, which are the only writing in the repository: the site publishes no entries today, so a drafts build is where this component renders on a page.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Links and the one action</p>
      <div class="sg-stack">
        <p class="kicker"><a class="text-link" href="#sg-parts">All repositories</a> <span aria-hidden="true">/</span> <a class="text-link" href="#sg-parts">All entries</a> <span aria-hidden="true">/</span> <a class="text-link" href="#sg-parts">RSS</a></p>
        <p><a class="btn btn-primary" href="#sg-parts">Back to the front page</a></p>
        <p><button class="btn btn-primary" type="button" disabled>Back to the front page</button></p>
      </div>
      <p class="meta">A command link is an underline drawn as a border, 30.1px tall; a button is 39.6px and carries a fill at 13.07:1. Disabled is dust type in a dashed dust edge, 7.51:1 — an unavailable action is still readable. Hover, tab and hold: the states are live.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Soundtrack · the footer of every page</p>
      <div class="sg-stack">
        <p><button class="soundtrack-toggle" type="button" aria-pressed="false" aria-label="Play the soundtrack"><svg class="soundtrack-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path class="soundtrack-play" d="M1 0.5 11 6 1 11.5Z"/><path class="soundtrack-pause" d="M1 0.5h3.2v11H1Zm6.8 0H11v11H7.8Z"/></svg>Soundtrack</button></p>
        <p><button class="soundtrack-toggle" type="button" aria-pressed="true" aria-label="Pause the soundtrack" data-pref="on"><svg class="soundtrack-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path class="soundtrack-play" d="M1 0.5 11 6 1 11.5Z"/><path class="soundtrack-pause" d="M1 0.5h3.2v11H1Zm6.8 0H11v11H7.8Z"/></svg>Soundtrack</button></p>
      </div>
      <p class="meta">Play, then pause. It is the one control on the site sized to a thumb — 44px square, where every other target clears 24px from its padding — because it is pressed on a phone in the footer. The word never changes and the glyph swaps inside the same 12px box, so the row cannot reflow when the state does; the second one is what a listener who has asked for the music sees, in the accent, and the stored choice still never starts a note on its own. Hover, tab and hold: the states are live.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Table · /projects/, 33 repositories in one compact table</p>
      <table class="table table--compact">
        <caption>Every public repository, newest push first — four real rows</caption>
        <thead><tr><th scope="col">Repository</th><th scope="col">Language</th><th scope="col" class="num">Stars</th><th scope="col" class="nowrap">Last push</th></tr></thead>
        <tbody>
          <tr><td><a href="https://github.com/superposition/superposition.github.io">superposition.github.io</a><span class="table-note">website</span></td><td class="nowrap">CSS</td><td class="num">0</td><td class="nowrap"><time datetime="2026-11-26">2026-11-26</time></td></tr>
          <tr><td><a href="https://github.com/superposition/bend-ml-lab">bend-ml-lab</a><span class="table-note">Einsum, training epochs, and weight-space diagnostics in Bend 2 — measured, with C/Node/NumPy twins</span></td><td class="nowrap">C</td><td class="num">0</td><td class="nowrap"><time datetime="2026-11-20">2026-11-20</time></td></tr>
          <tr><td><a href="https://github.com/superposition/DIVULGE">DIVULGE</a><span class="table-note">A native Rust/egui investigation workbench that makes AI-assisted reverse engineering understandable</span></td><td class="nowrap">Rust</td><td class="num">1</td><td class="nowrap"><time datetime="2026-11-13">2026-11-13</time></td></tr>
          <tr><td><a href="https://github.com/superposition/mage">mage</a><span class="table-note">GPU profiler TUI for Triton/CUDA kernels with nsys/ncu integration</span></td><td class="nowrap">Python</td><td class="num">6</td><td class="nowrap"><time datetime="2026-09-11">2026-09-11</time></td></tr>
        </tbody>
      </table>
      <p class="meta">Compact density: 8px rows, 12px between columns. The comfortable density sets those to 12 and 16 and changes nothing else. The link is the whole cell, so the target is the column on a phone.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Definition row · every repository page</p>
      <dl class="def">
        <div class="def-row"><dt>Language</dt><dd>Python</dd></div>
        <div class="def-row"><dt>Stars</dt><dd>6</dd></div>
        <div class="def-row"><dt>Last push</dt><dd><time datetime="2026-09-11">11 Sep 2026</time></dd></div>
      </dl>
      <p class="meta">The three facts a repository page opens with, at their own weights: label 13px mono in dust, value 15px mono 500 in star with tabular figures.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Range control · /journal/</p>
      <nav class="range" aria-label="Journal by topic">
        <span class="kicker">Topics</span>
        <ul class="range-list">
          <li><a class="range-link" href="#sg-parts">Matrices <span class="range-count">1</span></a></li>
          <li><a class="range-link" href="#sg-parts">Kinematics <span class="range-count">1</span></a></li>
          <li><a class="range-link" href="#sg-parts">Music <span class="range-count">1</span></a></li>
        </ul>
      </nav>
      <p class="meta">Pagination without a second page: the site is static, so a range is an anchor into one document. The counts are the number of entries a drafts build produces. A range with no entries is not rendered, and an anchor has no disabled state.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Notice · three repository pages</p>
      <aside class="notice">
        <p class="notice-title">CI has failed on every push since GTSAM</p>
        <p class="notice-text">The workflow runs CMake, which requires a GTSAM config package no commit provides: four runs succeeded before that commit, four failed after. There are no tests, and the counters are live readouts rather than a recorded run.</p>
      </aside>
      <p class="meta">The 2px left edge is <code>--state</code> at 10.62:1 on the panel. It replaced the callout, which was a box with nothing to say.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Skeleton · the home hero while the photograph is in flight</p>
      <div class="skeleton" style="position: relative; height: 220px;">
        <span class="skeleton-label">Loading the Carina Nebula</span>
      </div>
      <p class="meta">A frame, the raised panel and a label naming the file. It sits behind the photograph and is covered when the image paints; if the file fails, the label carries the alert instead. No shimmer.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Card · /projects/</p>
      <ul class="repo-grid">
        <li>
          <a class="card" href="#sg-parts">
            <span class="card-media"><img src="{{ '/assets/repos/mage/kernel-progression-1200.webp' | relative_url }}" alt="" width="600" height="375" loading="lazy"></span>
            <span class="card-title">Mage</span>
            <span class="card-text">GPU profiler TUI for Triton and CUDA kernels, with nsys and ncu integration</span>
            <span class="card-meta">Python · 6 stars</span>
          </a>
        </li>
        <li>
          <a class="card" href="#sg-parts">
            <span class="card-title">nanda-ts</span>
            <span class="card-text">A Bun-native TypeScript SDK for A2A agents, agent identity and the NANDA registry</span>
            <span class="card-meta">C · 0 stars</span>
          </a>
        </li>
      </ul>
      <p class="meta">Hover one: the title takes the accent and the hairline sweeps in. No shadow, no lift.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Prose</p>
      <div class="prose">
        <p>Body copy at 20px in the text face on the 39rem measure, 69.2 characters per line at 1440, with a <a href="#sg-parts">prose link in the nebula colour</a> and <code>inline code</code> on the surface.</p>
        <p class="eyebrow">The eyebrow</p>
        <h2>A section heading inside prose</h2>
        <p>The section heading is the display face at 22px in the writer's case, because the field's median first h2 inside an essay is 24px and 13px mono made six sections read as six footnotes. The mono keeps one job above it: an optional eyebrow, 13px Plex Mono 600, upper case and tracked, over the same hairline. A section that needs no category drops it.</p>
        <blockquote>A change of basis is not a change of the map: the arrows are the same arrows, and only the numbers you write them with are different.</blockquote>
        <h3>A third-level heading</h3>
        <p>Text under it, with a list and a figure.</p>
        <figure>
          <img src="{{ '/assets/art/galaxy/andromeda-960.webp' | relative_url }}" width="960" height="540" loading="lazy" alt="A panoramic field of stars in Andromeda.">
          <figcaption>The figure caption: 13px mono in dust over a hairline, the same rule as a plate or a campaign still.</figcaption>
        </figure>
        <table>
          <thead><tr><th>Token</th><th>Measured on void</th></tr></thead>
          <tbody><tr><td><code>--star</code></td><td>16.93:1</td></tr><tr><td><code>--dust</code></td><td>7.51:1</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Gauge rail, chip, HUD frame and alert</p>
      <h2 class="section-title">Section title with a gauge rail</h2>
      <p><span class="decal">Repository</span> <span class="kicker">Rust · 1 star</span></p>
      <div class="sg-stack">
        <figure class="figure">
          <img src="{{ '/assets/art/galaxy/sombrero-1200.webp' | relative_url }}" width="1200" height="1462" loading="lazy" alt="The Sombrero Galaxy seen edge-on, a bright core inside a dark dust lane.">
          <figcaption>A figure carries the HUD frame: one hairline box and two 16px corner ticks in <code>--accent</code>, 13.07:1 on the ground.</figcaption>
        </figure>
        <p><span class="alert">Signal lost</span> <span class="meta">the one red on the site: 5.01:1 as an edge, 7.46:1 as type. Once, on the 404, and once when a photograph fails.</span></p>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Crawl</p>
      <div class="crawl">
        <p class="lede">The home page opening statement, on a plane that tips four degrees in the poster identity, drifting 26px over 52 to 64 seconds inside a frame whose edges fade. It stops on request with the Hold control, and disappears under reduced motion together with the tilt and the fade.</p>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Poster, three ways</p>
      {%- assign mage = site.data.campaigns | where: "slug", "mage" | first -%}
      {%- assign coatcheck = site.data.campaigns | where: "slug", "coatcheck" | first -%}
      {%- assign marigraph = site.data.campaigns | where: "slug", "marigraph" | first -%}
      <div class="sg-row" style="align-items: flex-start">
        <div style="width: 260px">{% include campaign/poster.html campaign=mage index=2 total=20 %}</div>
        <div style="width: 260px">{% include campaign/poster.html campaign=coatcheck variant="field" index=19 total=20 %}</div>
        <div style="width: 260px">{% include campaign/poster.html campaign=marigraph variant="text" index=12 total=20 %}</div>
      </div>
      <p class="meta">With a still, with the plotted field a repository without figures gets, and with no art at all. A poster reads the semantic tokens, so an identity re-lights it. The strip that runs them is on the home page; the whole programme is at <a class="text-link" href="{{ '/now-showing/' | relative_url }}">/now-showing/</a>.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Empty state · /journal/ today</p>
      <div class="empty-state">
        <p class="empty-title">No entries yet</p>
        <p class="empty-text">The first one is being written. <a href="{{ '/feed.xml' | relative_url }}">Follow by RSS</a> and it will arrive.</p>
      </div>
      <p class="meta">A title naming the absence, a line on what happens next, one way out. This is the shipped state of the journal, not an example.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Motion</p>
      <p>Hover these, or tab through them. A command draws a hairline under itself in 200ms; a reference link thickens its resting rule in 140ms; a card's photograph grows 2% over 340ms. Nothing else on the page moves, and under <code>prefers-reduced-motion</code> every duration goes to zero so the state still arrives — it arrives at once.</p>
      <ul class="topic-list">
        <li><a href="#sg-parts">A command</a></li>
        <li><a href="#sg-parts">Another command</a></li>
      </ul>
      <ul class="entry-list" style="margin-top: var(--space-2)">
        <li><a class="entry" href="#sg-parts"><span class="entry-date">2026-11-20</span><span class="entry-title">An entry row sweeps under the whole line</span></a></li>
      </ul>
    </div>
  </section>

  <section class="sg-section" aria-labelledby="sg-identities">
    <h2 id="sg-identities">Identities</h2>
    <div class="prose">
      <p>The site ships one identity and carries two more in the same two stylesheets. The switch is one attribute on the root element: <code>data-lab="a"</code> for the instrument, <code>"b"</code> for the poster, and <code>"c"</code>, the default, for the hybrid. No page sets the attribute, so the workbench toolbar is the only place they are compared. Everything below is CSS; the page ships no JavaScript.</p>
    </div>
    <table class="table table--compact">
      <caption>The three identities, measured</caption>
      <thead><tr><th scope="col">Identity</th><th scope="col">Ground</th><th scope="col">Accent</th><th scope="col">Type</th><th scope="col">What it does</th></tr></thead>
      <tbody>
        <tr><td><code>c</code> shipped</td><td>#000000</td><td>amber 13.07:1; cyan state</td><td>Anton caps, serif body, Plex Mono</td><td>The NASA photograph at full strength with grain and vignette, gauge rails, HUD frames, chips, and one crawl on the home page.</td></tr>
        <tr><td><code>a</code> instrument</td><td>#0a0a0b</td><td>amber 12.3:1; cyan state</td><td>Plex Mono everywhere</td><td>Amber phosphor on carbon: scanlines, gauge rails, corner brackets, log entries. No crawl, and nothing drifts but the sensor feed.</td></tr>
        <tr><td><code>b</code> poster</td><td>#050508</td><td>cyan 12.5:1</td><td>Anton caps, sans body</td><td>A star field over a faint nebula, a tracked masthead, the opening statement as a crawl, and no glow anywhere.</td></tr>
      </tbody>
    </table>
    <p class="meta">The default is the recommendation. The other two stay because the exercise was to see them side by side, and each costs one block of tokens and one scoped block of rules.</p>
  </section>
</div>
