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
    <p class="lede">Every token and component on the site, rendered from the same stylesheets the pages use. The palette is sampled from the NASA imagery; the numbers beside each colour are measured contrast against the void ground.</p>
  </header>

  <section class="sg-section" aria-labelledby="sg-colour">
    <h2 id="sg-colour">Colour</h2>
    <ul class="swatches">
      <li class="swatch"><div class="chip" style="background: var(--void)"></div><div class="label"><b>--void</b>#0b0a0d · ground · 16.9:1 text</div></li>
      <li class="swatch"><div class="chip" style="background: var(--deep)"></div><div class="label"><b>--deep</b>#131118 · section ground</div></li>
      <li class="swatch"><div class="chip" style="background: var(--surface)"></div><div class="label"><b>--surface</b>#1c1a20 · raised block</div></li>
      <li class="swatch"><div class="chip" style="background: var(--star)"></div><div class="label"><b>--star</b>#f7ecdd · 16.9:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--starlight)"></div><div class="label"><b>--starlight</b>#cfc3b6 · 11.4:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--dust)"></div><div class="label"><b>--dust</b>#a79085 · 6.6:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--rust)"></div><div class="label"><b>--rust</b>#b8623f · 4.6:1 large</div></li>
      <li class="swatch"><div class="chip" style="background: var(--rust-text)"></div><div class="label"><b>--rust-text</b>#c9704a · 5.6:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--nebula)"></div><div class="label"><b>--nebula</b>#5474a8 · 4.2:1 edges</div></li>
      <li class="swatch"><div class="chip" style="background: var(--nebula-text)"></div><div class="label"><b>--nebula-text</b>#6f93c9 · 6.3:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--teal)"></div><div class="label"><b>--teal</b>#2d7f96 · 4.3:1 edges</div></li>
      <li class="swatch"><div class="chip" style="background: var(--teal-text)"></div><div class="label"><b>--teal-text</b>#3f97ad · 5.9:1</div></li>
      <li class="swatch"><div class="chip" style="background: var(--plum)"></div><div class="label"><b>--plum</b>#6b3f4d · fill only</div></li>
      <li class="swatch"><div class="chip" style="background: var(--plum-mark)"></div><div class="label"><b>--plum-mark</b>#9a5e72 · 3.4:1 mark</div></li>
    </ul>
  </section>

  <section class="sg-section" aria-labelledby="sg-type">
    <h2 id="sg-type">Type</h2>
    <div class="scale-row"><span class="name">--step-hero</span><span style="font: var(--step-hero)/.92 var(--font-display); letter-spacing: -.02em">Superposition</span></div>
    <div class="scale-row"><span class="name">--step-5</span><span style="font: var(--step-5)/1.1 var(--font-display)">Heading one</span></div>
    <div class="scale-row"><span class="name">--step-4</span><span style="font: var(--step-4)/1.25 var(--font-display)">Heading two</span></div>
    <div class="scale-row"><span class="name">--step-3</span><span style="font: var(--step-3)/1.7 var(--font-text)">Body text, set in the text face.</span></div>
    <div class="scale-row"><span class="name">--step-2</span><span style="font: var(--step-2)/1.7 var(--font-mono)">Entry line, mono</span></div>
    <div class="scale-row"><span class="name">--step-1</span><span style="font: var(--step-1)/1.6 var(--font-mono); text-transform: uppercase; letter-spacing: .06em">Meta, mono</span></div>
  </section>

  <section class="sg-section" aria-labelledby="sg-parts">
    <h2 id="sg-parts">Components</h2>

    <div class="sg-example">
      <p class="kicker">Topic row</p>
      <ul class="topic-list">
        <li><span class="dot dot-rust" aria-hidden="true"></span><a href="#sg-parts">Data informatics</a></li>
        <li><span class="dot dot-nebula" aria-hidden="true"></span><a href="#sg-parts">AI</a></li>
        <li><span class="dot dot-teal" aria-hidden="true"></span><a href="#sg-parts">Matrices</a></li>
        <li><span class="dot dot-plum" aria-hidden="true"></span><a href="#sg-parts">Kinematics</a></li>
        <li><span class="dot dot-dust" aria-hidden="true"></span><a href="#sg-parts">Cryptographic proofs</a></li>
      </ul>
    </div>

    <div class="sg-example">
      <p class="kicker">Entry list</p>
      <ul class="entry-list">
        <li><a class="entry" href="#sg-parts"><span class="entry-date">20 Nov 2026</span><span class="entry-title">What a matrix does to a basis</span><span class="entry-dek"> — one line of description.</span></a></li>
        <li><a class="entry" href="#sg-parts"><span class="entry-date">14 Nov 2026</span><span class="entry-title">Motion in one frame and another</span><span class="entry-dek"> — one line of description.</span></a></li>
      </ul>
    </div>

    <div class="sg-example">
      <p class="kicker">Prose</p>
      <div class="prose">
        <p>Body copy in the text face, with a <a href="#sg-parts">link in the prose colour</a> and <code>inline code</code> on the surface.</p>
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
      <p class="empty">An empty state, in dust.</p>
    </div>
  </section>
</div>
