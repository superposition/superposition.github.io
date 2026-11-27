export default {
  title: 'Components/Empty state',
  parameters: {
    docs: {
      description: {
        component:
          'What a page says when there is nothing to show yet. A title that names the absence, a line on what happens next, and a link out — never five empty headings.',
      },
    },
  },
  render: (args) => `<div class="wrap"><p class="kicker">${args.note}</p>${args.body}</div>`,
  argTypes: { note: { control: false }, body: { control: false } },
};

export const Journal = {
  args: {
    note: 'The journal as it ships today: no entries yet, one line on what lands, one link out.',
    body: `<div class="empty-state">
      <p class="empty-title">No entries yet</p>
      <p class="empty-text">The first one is being written. <a href="#storybook-root">Follow by RSS</a> and it will arrive.</p>
    </div>`,
  },
};

export const Repositories = {
  args: {
    note: 'The repository grid before the pages land: the absence is named, and the full list below still answers the question.',
    body: `<div class="empty-state">
      <p class="empty-title">No repository pages yet</p>
      <p class="empty-text">They are being written. Until they land, every public repository is listed below.</p>
    </div>`,
  },
};

export const WithAction = {
  args: {
    note: 'With an action when the reader can do something about it.',
    body: `<div class="empty-state">
      <p class="empty-title">Nothing in this topic</p>
      <p class="empty-text">No entry has been filed under Kinematics.</p>
      <p><a class="btn btn-secondary btn-sm" href="#storybook-root">Read every entry</a></p>
    </div>`,
  },
};
