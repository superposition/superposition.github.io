const article = `<div class="wrap">
  <article class="prose">
    <p class="eyebrow">The eyebrow</p>
    <h2>A matrix is a statement about arrows</h2>
    <p>Body copy is 20px in the text face at 1.6, held to <code>--measure</code> (39rem, which is 624px, and 69.2 characters per line at 1440). A <a href="#storybook-root">prose link</a> takes the nebula colour (6.69:1) so it reads as a different thing from a chrome link; inline <code>code</code> sits on <code>--surface</code> with no border and breaks rather than scrolling when a C++ identifier outruns a phone column.</p>
    <h3>An h3 is a label, not a title</h3>
    <p>It is 13px mono upper case in starlight, which is why it never competes with the h2 above it.</p>
    <ul>
      <li>Eigenvectors first, because everything else follows from them.</li>
      <li>A second item, with a <a href="#storybook-root">link</a> in it.</li>
    </ul>
    <ol>
      <li>Ordered lists use the same leading as unordered ones.</li>
      <li>Numbering is the browser's, not a counter.</li>
    </ol>
    <blockquote>A change of basis is not a change of the map. The arrows are the same arrows; only the numbers you write them with are different. The plum-mark edge is the quotation and the type steps back to starlight — nothing in it is a warning.</blockquote>
    <aside class="notice">
      <p class="notice-title">Measured, not eyeballed</p>
      <p class="notice-text">Contrast is measured from a rendered screenshot with the type hidden, so the photograph behind it is part of the measurement. The cyan edge is the state colour, at 10.62:1 on the raised block.</p>
    </aside>
    <pre><code>curl -sI https://superposition.github.io/ | head -1
# HTTP/2 200</code></pre>
    <p>A code block carries no caption of its own: if the command needs explaining, the explanation is a sentence above it, which is what this one is.</p>
    <table>
      <thead><tr><th>Token</th><th>Measured on void</th><th>Used for</th></tr></thead>
      <tbody>
        <tr><td><code>--star</code></td><td>16.93:1</td><td>body and headings</td></tr>
        <tr><td><code>--dust</code></td><td>7.51:1</td><td>meta, captions, table head</td></tr>
        <tr><td><code>--state</code></td><td>12.93:1</td><td>focus rings, state edges</td></tr>
      </tbody>
    </table>
    <hr>
    <p>After the rule, the argument continues. The hr is the one hairline weight the site has.</p>
  </article>
</div>`;

export default {
  title: 'Components/Prose',
  parameters: {
    usedOn: ['_repos/mage.md', '_layouts/post.html'],
    docs: {
      description: {
        component:
          'The reading column: everything an entry or a repository page can contain, at the sizes it ships. h2 in the display face at --step-4 in the writer’s case over a hairline, with the mono demoted to an optional .eyebrow above it (option (b), the machine voice at --step-3, is one declaration away in the stylesheet), h3 as a 13px mono label, body at --step-3/1.6 on the 39rem measure, a blockquote with a 2px plume edge (4.22:1 as an edge), a notice for the caveat beside the argument, a pre at --step-2 on the panel, and a table that is the same component as the index. The reading density: --flow (24px, one 8px step) between blocks.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Article = {
  args: { body: article },
};

export const EntryPage = {
  args: {
    body: `<article class="entry-page wide">
      <header class="entry-head">
        <p><span class="decal">Kinematics</span> <span class="kicker"><time datetime="2026-11-27">2026-11-27</time></span></p>
        <h1>A long entry built to measure the reading column</h1>
        <p class="lede">The headline sets in its own 52rem block, the lede holds at 49 characters a line, and the prose underneath runs 69.2 — three widths, each measured rather than guessed.</p>
      </header>
      <div class="prose entry-body">
        <p>Position is easy to write and hard to mean. When we say a body is at a point, we have already chosen a frame, an origin and a direction, and every one of those choices is invisible in the symbol. The notation carries the answer and hides the question, which is why the first hour of any derivation is usually spent deciding what the words mean rather than what the equations say.</p>
        <p class="eyebrow">The plate</p>
        <h2>A section heading inside an entry</h2>
        <p>An entry's prose gets the rule the repository pages already have: the prose box is as wide as a plate may be, the text inside it is not, and the figure is the one child that fills it. The caption stays on the text measure, so it never runs the width of the picture.</p>
        <figure>
          <img src="/assets/art/orbits.png" width="1902" height="827" alt="Two rough black ink rings crossing a vermilion disc.">
          <figcaption>The figure breaks out to --figure-max (1000px, 0.69 of a 1440 viewport, which is where Nautilus and Low-tech keep theirs) and the caption stops at the reading measure.</figcaption>
        </figure>
        <p>Below the plate the column returns to 624px. Nothing else about the entry changes: the h2 is the display face at 22px, the h3 is still the 13px mono label, and the caption is still 13px mono in dust over a hairline.</p>
        <h3>A third-level heading</h3>
        <p>Text under it, at the same measure as the prose above.</p>
      </div>
      <footer class="entry-foot"><a class="text-link" href="#storybook-root">← All entries</a></footer>
    </article>`,
  },
};

export const LinkInProse = {
  args: {
    body: `<div class="wrap"><div class="prose">
      <p>The conversion is in <a href="#storybook-root">the Lumenera white paper</a>, table 3. A prose link is <code>--nebula-text</code> at 6.69:1 — the one colour sampled from the Carina photograph, kept so a citation inside an article is visibly not chrome.</p>
    </div></div>`,
  },
};

export const Code = {
  args: {
    body: `<div class="wrap"><div class="prose">
      <p>Inline <code>std::thread::hardware_concurrency()</code> breaks anywhere rather than pushing the column wide: at 19px that identifier is 362px in a 339px column, which is what made the page 5px too wide at 375 once.</p>
      <pre><code>cargo build --release
./target/release/mage profile script.py</code></pre>
    </div></div>`,
  },
};
