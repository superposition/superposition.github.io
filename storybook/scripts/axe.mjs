/* One story, one axe run, serialised.

   The addon-a11y panel in the preview runs its own pass on every story as soon
   as it renders — in the same page, on the same `axe` global — and axe-core
   refuses a second run while one is in flight with "Axe is already running. Use
   `await axe.run()` to wait for the previous run to finish". That is how this
   gate failed once on a runner slower than the laptop it was written on while
   passing everywhere locally: the two runs raced.

   So the two are serialised rather than raced. The page is asked for an idle
   instance, the instance is replaced with this file's own copy of axe-core, and
   if the panel takes the global in between, the run is retried instead of
   thrown. Nothing is swallowed: a story whose axe never comes free fails the
   run, and a violation is still a violation.

   It lives in its own module so it can be exercised on its own: the race that
   broke the gate was reproduced by starting a run on the page and calling this
   function while it was in flight, and this function still returned. */

const IDLE = () => !window.axe || !window.axe._running;

export async function measureRun (page, { source, tags, id, attempts = 20 }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await page.waitForFunction(IDLE, { timeout: 20000 }).catch(() => {});
    await page.evaluate(source);
    try {
      return await page.evaluate(async (values) => {
        const { violations } = await window.axe.run(document, {
          runOnly: { type: 'tag', values },
        });
        return violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')),
          count: v.nodes.length,
        }));
      }, tags);
    } catch (error) {
      if (!/already running/i.test(String(error))) throw error;
      await new Promise((ok) => setTimeout(ok, 150 + attempt * 150));
    }
  }
  throw new Error(`${id}: axe never came free of the panel's own run`);
}
