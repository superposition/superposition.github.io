const article = `<div class="wrap">
  <article class="prose">
    <h2>A matrix is a statement about arrows</h2>
    <p>Body copy is 17px in the text face at 1.7, held to <code>--measure</code> (64ch). A <a href="#storybook-root">prose link</a> takes the nebula colour so it reads as a different thing from a chrome link; inline <code>code</code> sits on <code>--surface</code> with no border.</p>
    <h3>An h3 is a label, not a title</h3>
    <p>It is 13px mono upper case in starlight, which is why it never competes with the h2 above it.</p>
    <ul>
      <li>A list item, one line of thinking.</li>
      <li>A second, with a <a href="#storybook-root">link</a>.</li>
    </ul>
    <ol>
      <li>Ordered lists use the same leading.</li>
      <li>Numbering is the browser’s, not a counter.</li>
    </ol>
    <blockquote>The plum-mark edge is the quotation, and the type steps back to starlight. It is not a callout: nothing in it is a warning.</blockquote>
    <div class="callout">
      <span class="callout-title">Where this number comes from</span>
      Contrast is measured from a screenshot with the type hidden, so the photograph behind it is part of the measurement. The cyan edge is the state colour, at 10.6:1 on the raised block.
    </div>
    <figure class="code-block">
      <pre><code>curl -sI https://superposition.github.io/ | head -1</code></pre>
      <figcaption>The command, then what it proved: a code block carries a caption the way a figure does, 13px mono in dust over a hairline.</figcaption>
    </figure>
    <table>
      <thead><tr><th>Token</th><th>Measured on void</th><th>Used for</th></tr></thead>
      <tbody>
        <tr><td><code>--star</code></td><td>16.9:1</td><td>body and headings</td></tr>
        <tr><td><code>--dust</code></td><td>6.6:1</td><td>meta and captions</td></tr>
        <tr><td><code>--state</code></td><td>12.2:1</td><td>focus rings, edges</td></tr>
      </tbody>
    </table>
    <hr>
    <p>After the rule, the argument continues. The hr is the one hairline weight the site has.</p>
  </article>
</div>`;

export default {
  title: 'Components/Prose',
  parameters: {
    docs: {
      description: {
        component:
          'The reading column. Everything an entry or a repository page can contain, at the sizes it actually ships: h2 in the display face, h3 as a mono label, body at 17/1.7 on the 64ch measure.',
      },
    },
  },
  render: (args) => args.body,
  argTypes: { body: { control: false } },
};

export const Article = {
  args: { body: article },
};

export const Callout = {
  args: {
    body: `<div class="wrap"><div class="prose">
      <p>Prose, then a callout: for the caveat or the measurement that belongs beside the argument but is not the argument.</p>
      <div class="callout">
        <span class="callout-title">Measured, not eyeballed</span>
        The cyan edge is 10.6:1 on --surface and 12.2:1 on --void. The type inside is starlight, 11.7:1 on the raised block.
      </div>
      <p>A callout with no title is allowed; the title is the part that earns the block.</p>
    </div></div>`,
  },
};

export const CodeBlock = {
  args: {
    body: `<div class="wrap"><div class="prose">
      <p>A code block is a figure with a caption, so the caption is where the provenance goes.</p>
      <figure class="code-block"><pre><code>npm ci &amp;&amp; npm run storybook</code></pre><figcaption>From storybook/. Serves on http://localhost:6017/.</figcaption></figure>
      <p>Inline code is the same face at .88em, on the raised block, and it never wraps a line break in a word.</p>
    </div></div>`,
  },
};

export const Table = {
  args: {
    body: `<div class="wrap"><div class="prose">
      <p>A table breaks out of the measure and scrolls sideways instead of squeezing, so the numbers stay readable at 420.</p>
      <table><thead><tr><th>Pair</th><th>Ratio</th></tr></thead><tbody><tr><td>--star on --void</td><td>16.9:1</td></tr><tr><td>--starlight on --void</td><td>11.4:1</td></tr><tr><td>--dust on --void</td><td>6.6:1</td></tr></tbody></table>
    </div></div>`,
  },
};
