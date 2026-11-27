/* The palette, read out of tokens.css at runtime.

   The canvas has no colours of its own. Every value the scene draws with is
   fetched here, by name, from the same custom properties the stylesheet uses,
   so a change to `--cream` in tokens.css moves the bear's fur and the page's
   body copy together and neither can drift from the other. A token that the
   stylesheet failed to load arrives as an empty string, which is why `read`
   throws rather than letting a black-on-black scene render. */

export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const read = (name) => {
    const value = style.getPropertyValue(name).trim();
    if (!value) throw new Error(`tokens.css does not declare ${name}`);
    return value;
  };
  return {
    void: read('--void'),
    deep: read('--deep'),
    star: read('--star'),
    cream: read('--cream'),
    amber: read('--amber'),
    dust: read('--dust'),
    cyan: read('--cyan'),
  };
}
