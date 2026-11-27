const article = `<div class="wrap">
  <article class="prose">
    <h2>A matrix is a statement about arrows</h2>
    <p>Body copy is 19px in the text face at 1.6, held to <code>--measure</code> (34rem, which is 544px). A <a href="#storybook-root">prose link</a> takes the nebula colour (6.69:1) so it reads as a different thing from a chrome link; inline <code>code</code> sits on <code>--surface</code> with no border and breaks rather than scrolling when a C++ identifier outruns a phone column.</p>
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
          'The reading column: everything an entry or a repository page can contain, at the sizes it ships. h2 in the display face over a hairline, h3 as a 13px mono label, body at --step-3/1.6 on the 34rem measure, a blockquote with a 2px plume edge (4.22:1 as an edge), a notice for the caveat beside the argument, a pre at --step-2 on the panel, and a table that is the same component as the index. The reading density: --flow (24px, one 8px step) between blocks.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Article = {
  args: { body: article },
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
