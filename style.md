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
    <p class="lede">Every token and component on the site, rendered from the same stylesheets the pages use. The numbers beside each colour are measured contrast against the void ground; <code>npm run contrast</code> in <code>storybook/</code> prints every pair over all three identities and fails under 4.5:1 for text, 3:1 for a control edge.</p>
  </header>

  <section class="sg-section" aria-labelledby="sg-colour">
    <h2 id="sg-colour">Colour</h2>
    <ul class="swatches">
      <li class="swatch"><div class="chip" style="background: var(--void)"></div><div class="label"><b>--void</b>#000000 · ground · 16.9:1 text</div></li>
      <li class="swatch"><div class="chip" style="background: #000 var(--rim)"></div><div class="label"><b>--rim</b>accent at 5.5% · the rim at the top of the page</div></li>
      <li class="swatch"><div class="chip" style="background: var(--panel)"></div><div class="label"><b>--panel</b>#131118 → #000000 · blocks and callouts</div></li>
      <li class="swatch"><div class="chip" style="background: var(--deep)"></div><div class="label"><b>--deep</b>#131118 · section ground</div></li>
      <li class="swatch"><div class="chip" style="background: var(--surface)"></div><div class="label"><b>--surface</b>#1c1a20 · raised block</div></li>
      <li class="swatch"><div class="chip" style="background: var(--star)"></div><div class="label"><b>--star</b>#efe6d3 · 16.9:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--starlight)"></div><div class="label"><b>--starlight</b>#e6dcc8 · 15.4:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--dust)"></div><div class="label"><b>--dust</b>#a99884 · 7.5:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent)"></div><div class="label"><b>--accent</b>#ffc24a · 13.1:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent-peak)"></div><div class="label"><b>--accent-peak</b>#ffd966 · hover</div></li>
      <li class="swatch"><div class="chip" style="background: var(--accent-warm)"></div><div class="label"><b>--accent-warm</b>#e98e5b · 8.0:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--state)"></div><div class="label"><b>--state</b>#8fd3ff · 12.9:1 · focus and state</div></li>
      <li class="swatch"><div class="chip" style="background: var(--state-text)"></div><div class="label"><b>--state-text</b>#a9dcff · 13.5:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--alert)"></div><div class="label"><b>--alert</b>#e2402f · 5.0:1 edge only</div></li>
      <li class="swatch"><div class="chip" style="background: var(--alert-text)"></div><div class="label"><b>--alert-text</b>#f4735f · 7.5:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--nebula-text)"></div><div class="label"><b>--nebula-text</b>#6f93c9 · 6.7:1 · prose links</div></li>
      <li class="swatch"><div class="chip" style="background: var(--plum)"></div><div class="label"><b>--plum</b>#6b3f4d · fill only</div></li>

      <li class="swatch"><div class="chip" style="background: var(--plum-mark)"></div><div class="label"><b>--plum-mark</b>#9a5e72 · 4.2:1 edge</div></li>
      <li class="swatch"><div class="chip" style="background: var(--decal-bg)"></div><div class="label"><b>--decal-bg</b>rgba(0,0,0,.85) · decal film</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-lamp)"></div><div class="label"><b>--poster-lamp</b>· the lamp on dark metal</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-edge)"></div><div class="label"><b>--poster-edge</b>· a lit edge under the art</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-wash)"></div><div class="label"><b>--poster-wash</b>· the cool half of the wash</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-scrim)"></div><div class="label"><b>--poster-scrim</b>· the dark key art fades into</div></li>
      <li class="swatch"><div class="chip" style="background: var(--poster-metal)"></div><div class="label"><b>--poster-metal</b>· the poster frame</div></li>
    </ul>
  </section>

  <section class="sg-section" aria-labelledby="sg-type">
    <h2 id="sg-type">Type</h2>
    <div class="scale-row"><span class="name">--step-hero</span><span style="font: var(--step-hero)/.92 var(--font-display); letter-spacing: -.02em">Superposition</span></div>
    <div class="scale-row"><span class="name">--step-5</span><span style="font: var(--step-5)/1.1 var(--font-display)">Heading one</span></div>
    <div class="scale-row"><span class="name">--step-4</span><span style="font: var(--step-4)/1.25 var(--font-display)">Heading two</span></div>
    <div class="scale-row"><span class="name">--step-3</span><span style="font: var(--step-3)/var(--leading-body) var(--font-text)">Body text, set in the text face.</span></div>
    <div class="scale-row"><span class="name">--step-2</span><span style="font: var(--step-2)/1.7 var(--font-mono)">Entry line, mono</span></div>
    <div class="scale-row"><span class="name">--step-2</span><span style="font: var(--step-2)/1.7 var(--font-mono)">Entry line, IBM Plex Mono</span></div>
    <div class="scale-row"><span class="name">--step-1</span><span style="font: var(--step-1)/1.6 var(--font-mono); text-transform: uppercase; letter-spacing: var(--track-label)">Meta, mono, tracked</span></div>
    <div class="scale-row"><span class="name">--step-decal</span><span class="decal">A decal eyebrow</span></div>
    <div class="scale-row"><span class="name">--track-hero</span><span style="font: var(--step-5)/1 var(--font-display); text-transform: uppercase; letter-spacing: var(--track-hero)">Tracked display caps</span></div>
  </section>

  <section class="sg-section" aria-labelledby="sg-parts">
    <h2 id="sg-parts">Components</h2>

    <div class="sg-example">
      <p class="kicker">Topic row</p>
      <ul class="topic-list">
        <li><span class="dot dot-accent" aria-hidden="true"></span><a href="#sg-parts">Data informatics</a></li>
        <li><span class="dot dot-nebula" aria-hidden="true"></span><a href="#sg-parts">AI</a></li>
        <li><span class="dot dot-state" aria-hidden="true"></span><a href="#sg-parts">Matrices</a></li>
        <li><span class="dot dot-plum" aria-hidden="true"></span><a href="#sg-parts">Kinematics</a></li>
        <li><span class="dot dot-dust" aria-hidden="true"></span><a href="#sg-parts">Cryptographic proofs</a></li>
      </ul>
    </div>

    <div class="sg-example">
      <p class="kicker">Entry list</p>
      <ul class="entry-list">
        <li><a class="entry" href="#sg-parts"><span class="entry-date"><time datetime="2026-11-20">2026-11-20</time></span><span class="entry-title">What a matrix does to a basis</span><span class="entry-dek">One line of description.</span></a></li>
        <li><a class="entry" href="#sg-parts"><span class="entry-date"><time datetime="2026-11-14">2026-11-14</time></span><span class="entry-title">Motion in one frame and another</span><span class="entry-dek">One line of description.</span></a></li>
      </ul>
      <p class="kicker">The stamp is an ISO date in mono with tabular figures; the square before it is drawn with a background, never a glyph, so no reader hears it. Under <code>data-lab="a"</code> the list takes a gauge rule down its side and the same rows read as a log.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Prose</p>
      <div class="prose">
        <p>Body copy in the text face, with a <a href="#sg-parts">link in the prose colour</a> and <code>inline code</code> on the surface.</p>
        <h2>A section heading inside prose</h2>
        <p>The section heading is the label voice, not the display face: IBM Plex Mono 600 at --step-1, uppercase, tracked, in star on the hairline. Anton starts at 22px and is the name a page is called by.</p>
        <blockquote>A blockquote keeps the plum edge and steps back to the secondary text colour.</blockquote>
        <h3>A third-level heading</h3>
        <p>Text under it.</p>
        <figure>
          <img src="{{ '/assets/art/galaxy/andromeda-960.webp' | relative_url }}" width="960" height="540" loading="lazy" alt="A field of stars in Andromeda.">
          <figcaption>Figure caption: 13px mono, dust, over a hairline.</figcaption>
        </figure>
        <table>
          <thead><tr><th>Token</th><th>Measured</th></tr></thead>
          <tbody><tr><td>--star</td><td>16.9:1</td></tr><tr><td>--dust</td><td>6.6:1</td></tr></tbody>
        </table>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Links, focus and meta</p>
      <p><a href="#sg-parts">A default link</a> · <a href="#sg-parts">another</a> · <span class="meta">meta text</span></p>
    </div>

    <div class="sg-example">
      <p class="kicker">Buttons</p>
      <div class="sg-stack">
        <div class="sg-row">
          <a class="btn btn-primary" href="#sg-parts">Primary</a>
          <a class="btn btn-secondary" href="#sg-parts">Secondary</a>
          <a class="btn btn-ghost" href="#sg-parts">Ghost</a>
          <button class="btn btn-text" type="button">Text</button>
        </div>
        <div class="sg-row">
          <a class="btn btn-primary btn-sm" href="#sg-parts">Small</a>
          <a class="btn btn-primary" href="#sg-parts">Default</a>
          <a class="btn btn-primary btn-lg" href="#sg-parts">Large</a>
        </div>
        <div class="sg-row">
          <button class="btn btn-primary" type="button" disabled>Disabled</button>
          <button class="btn btn-secondary" type="button" disabled>Disabled</button>
          <button class="btn btn-ghost" type="button" disabled>Disabled</button>
        </div>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Badges</p>
      <div class="sg-row">
        <span class="badge">Python</span>
        <span class="badge badge-accent">Matrices</span>
        <span class="badge badge-state">In progress</span>
        <span class="badge badge-solid">6 stars</span>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Cards</p>
      <ul class="repo-grid">
        <li>
          <a class="card" href="#sg-parts">
            <span class="card-media"><img src="{{ '/assets/repos/mage/kernel-progression-1200.webp' | relative_url }}" alt="" width="600" height="375" loading="lazy"></span>
            <span class="card-title">Mage</span>
            <span class="card-text">GPU profiler TUI for Triton and CUDA kernels, with nsys and ncu integration.</span>
            <span class="card-meta">Python · 6 stars</span>
          </a>
        </li>
        <li>
          <a class="card entry-card" href="#sg-parts">
            <span class="card-kicker">Matrices · 20 Nov 2026</span>
            <span class="card-title">What a matrix does to a basis</span>
            <span class="card-text">One line of description, the same dek the entry list shows.</span>
            <span class="card-foot"><span class="badge badge-accent">Matrices</span></span>
          </a>
        </li>
      </ul>
    </div>

    <div class="sg-example">
      <p class="kicker">Callout and code block</p>
      <div class="prose">
        <div class="callout">
          <span class="callout-title">Where this number comes from</span>
          Contrast is measured from a screenshot with the text hidden, not read off the token file.
        </div>
        <figure class="code-block">
          <pre><code>curl -sI https://superposition.github.io/ | head -1</code></pre>
          <figcaption>A code block carries a caption the way a figure does.</figcaption>
        </figure>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Gauge rail, decal, HUD frame and alert</p>
      <h2 class="section-title">Section title with a gauge rail</h2>
      <p><span class="decal">Repository</span> <span class="kicker">Rust · 41 stars</span></p>
      <div class="sg-stack">
        <figure class="figure">
          <img src="{{ '/assets/art/galaxy/sombrero-1200.webp' | relative_url }}" width="1200" height="1462" loading="lazy" alt="The Sombrero Galaxy seen edge-on.">
          <figcaption>A figure carries the HUD frame: one hairline box and two corner ticks in --accent, measured at 12.3:1.</figcaption>
        </figure>
        <div class="callout">
          <span class="callout-title">A callout</span>
          The left edge is --state, the cyan, at 12.2:1 on the ground.
        </div>
        <p><span class="alert">Signal lost</span> <span class="meta">the one red on the site, used once, on the 404 page</span></p>
      </div>
      <p class="kicker">Warning stripe</p>
      <div class="hazard" aria-hidden="true"></div>
      <p class="meta">Rendered only under data-lab="a", and only on the home page, where it marks the edge of the opening.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Crawl</p>
      <div class="crawl">
        <p class="lede">The home page opening statement, on a plane that tips four degrees in the poster identity, drifting 26px over 52 to 64 seconds inside a frame whose edges fade. It stops on request and disappears under reduced motion.</p>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Poster, three ways</p>
      {%- assign mage = site.data.campaigns | where: "slug", "mage" | first -%}
      {%- assign cairo = site.data.campaigns | where: "slug", "cairo_vault" | first -%}
      {%- assign marigraph = site.data.campaigns | where: "slug", "marigraph" | first -%}
      <div class="sg-row" style="align-items: flex-start">
        <div style="width: 260px">{% include campaign/poster.html campaign=mage index=2 total=20 %}</div>
        <div style="width: 260px">{% include campaign/poster.html campaign=cairo variant="field" index=19 total=20 %}</div>
        <div style="width: 260px">{% include campaign/poster.html campaign=marigraph variant="text" index=12 total=20 %}</div>
      </div>
      <p class="meta">With a still, with the plotted field a repository without figures gets, and with no art at all. A poster reads the semantic tokens, so the three identities re-light it: under <code>data-lab="b"</code> the film line goes cold with --accent and the lamp is a printed wash rather than a glow. The strip that runs them is on the home page; the whole programme is at <a class="text-link" href="{{ '/now-showing/' | relative_url }}">/now-showing/</a>.</p>
    </div>

    <div class="sg-example">
      <p class="kicker">Empty state</p>
      <div class="empty-state">
        <p class="empty-title">No entries yet</p>
        <p class="empty-text">The first one is being written. <a href="#sg-parts">Follow by RSS</a> and it will arrive.</p>
      </div>
    </div>

    <div class="sg-example">
      <p class="kicker">Motion</p>
      <p>Hover these, or tab through them. A command draws a 1px hairline under itself in 200ms; a reference link thickens its resting rule in 140ms. Neither moves anything else on the page.</p>
      <ul class="topic-list">
        <li><a href="#sg-parts">A command</a></li>
        <li><a href="#sg-parts">another command</a></li>
      </ul>
      <ul class="entry-list" style="margin-top: var(--space-2)">
        <li><a class="entry" href="#sg-parts"><span class="entry-date">27 Nov 2026</span><span class="entry-title">An entry row sweeps under the whole line</span></a></li>
      </ul>
      <p style="margin-top: var(--space-2)"><a class="text-link" href="#sg-parts">A reference link</a> · <a href="#sg-parts">a prose link</a></p>
      <p class="empty">Figures develop on scroll with the entry and repository pages; the hero photograph drifts on the home page.</p>
    </div>
  </section>

  <section class="sg-section" aria-labelledby="sg-identities">
    <h2 id="sg-identities">Identities</h2>
    <div class="prose">
      <p>The site ships one identity and carries two more in the same two stylesheets. The switch is one attribute on the root element: <code>data-lab="a"</code> for the instrument, <code>"b"</code> for the poster, and <code>"c"</code>, the default, for the hybrid. Everything below is CSS; the page ships no JavaScript.</p>
    </div>
    <table class="sg-table">
      <thead><tr><th>Identity</th><th>Ground</th><th>Accent</th><th>Type</th><th>What it does</th></tr></thead>
      <tbody>
        <tr><td><code>c</code> shipped</td><td data-label="Ground">#0b0a0d</td><td data-label="Accent">amber 12.3:1; cyan state</td><td data-label="Type">Anton caps, serif body, Plex Mono</td><td data-label="What it does">The NASA photograph at full strength with grain and vignette, gauge rails, HUD frames, decals, and one crawl on the home page.</td></tr>
        <tr><td><code>a</code> instrument</td><td data-label="Ground">#0a0a0b</td><td data-label="Accent">amber 12.3:1; cyan state</td><td data-label="Type">Plex Mono everywhere</td><td data-label="What it does">Amber phosphor on carbon: scanlines, gauge rails, corner brackets, log entries, one hazard stripe. No crawl, and nothing drifts but the sensor feed.</td></tr>
        <tr><td><code>b</code> poster</td><td data-label="Ground">#050508</td><td data-label="Accent">cyan 12.5:1</td><td data-label="Type">Anton caps, sans body</td><td data-label="What it does">A star field over a faint nebula, a tracked masthead, the opening statement as a crawl, and no glow anywhere.</td></tr>
      </tbody>
    </table>
    <p class="meta">The default is the recommendation. The other two stay because the exercise was to see them side by side, and each costs one block of tokens and one scoped block of rules.</p>
  </section>
</div>