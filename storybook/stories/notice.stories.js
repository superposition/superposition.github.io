export default {
  title: 'Components/Notice',
  parameters: {
    usedOn: ['_repos/nanda-ts.md', '_repos/cairo_vault.md', '_repos/macos-metal-vslam.md'],
    docs: {
      description: {
        component:
          'One inline notice: something true the reader needs before the prose, which is not the argument. A 2px --state edge (10.62:1 on the panel), the raised ground, a label and a line. Three repository pages carry one, each summarising the caveat its own page ends with, so a reader who stops after the lede still knows. Red is not available here: red is the 404 and a photograph that failed, and a caveat is neither.',
      },
    },
  },
  render: (args) => `<div class="wide"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

const notice = (title, text) => `<aside class="notice">
  <p class="notice-title">${title}</p>
  <p class="notice-text">${text}</p>
</aside>`;

export const Cryptography = {
  args: {
    note: 'The notice on /projects/nanda-ts/: the finding the page takes 2,000 words to reach.',
    body: notice(
      'The cryptography is a placeholder',
      '<code>sign</code> returns SHA-256 over the key and the data instead of an Ed25519 signature, so a DID minted here will not verify against a real <code>did:key</code> resolver. The MCP bridge throws on every call, and 1,029 of the 1,134 tracked files are a committed PlatformIO build tree.',
    ),
  },
};

export const CiRed = {
  args: {
    note: 'The notice on /projects/macos-metal-vslam/, where the state is the point: four runs succeeded before the GTSAM commit, four failed after.',
    body: notice(
      'CI has failed on every push since GTSAM',
      'The workflow runs CMake, which requires a GTSAM config package no commit provides: four runs succeeded before that commit, four failed after. There are no tests, and the counters are live readouts rather than a recorded run.',
    ),
  },
};

export const NotAVault = {
  args: {
    note: 'The notice on /projects/cairo_vault/, which names what the contract does not do before the page explains what it does.',
    body: notice(
      'An accounting exercise, not a vault',
      "A deposit writes a number into a map and adds it to a total. There is no token address, no dispatcher and no transfer, so a caller's deposit is a claim it makes about itself. No tests, no pinned Scarb version, and the package is still called <code>hello_world</code>.",
    ),
  },
};
