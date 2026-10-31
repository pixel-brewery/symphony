import {
  Avatar,
  Button,
  DialogHeader,
  Dismiss,
  Divider,
  Radio,
  RadioGroup,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// mosaik-dialog-header is `flex: 1` and collapses in a vertical flex parent,
// so the header always sits in its own horizontal row — the way mosaik-dialog places it.
const surface = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--mosaik-layout-space)',
  padding: 'calc(var(--mosaik-layout-space) * 2)',
  borderRadius: 'var(--mosaik-layout-radius)',
  border: '1px solid var(--mosaik-scheme-highlight)',
  background: 'var(--mosaik-scheme-surface)',
} as const;

const headerRow = { display: 'flex', alignItems: 'center' } as const;
const footerRow = { display: 'flex', justifyContent: 'flex-end', gap: '8px' } as const;

export const GroupTicketsDialog = () => (
  <div style={surface}>
    <div style={headerRow}>
      <DialogHeader
        text="Group selected tickets"
        subText="Choose whether Symphony should analyze the relationship first."
      />
    </div>
    <Divider />
    <RadioGroup name="delivery-group-mode" orientation="vertical" value="direct">
      <Radio value="direct" label="Copy directly without AI analysis" />
      <Radio value="analyzer" label="Analyze relationship with AI first" />
    </RadioGroup>
    <div style={footerRow}>
      <Button label="Cancel" appearance="plain" />
      <Button label="Continue" appearance="solid" variant="primary" />
    </div>
  </div>
);

export const WithSuffixDismiss = () => (
  <div style={surface}>
    <div style={headerRow}>
      <DialogHeader
        text="Delete workspace WS-7"
        subText="The managed worktree and its 2.4 GB of execution artifacts are removed."
      >
        <Dismiss slot="suffix" appearance="plain" size="small" variant="neutral" />
      </DialogHeader>
    </div>
    <Divider />
    <Text
      text="The delivery branch codex/fix-ci-case-paths has already been pushed, so no commits are lost."
      wrap
    />
  </div>
);

export const WithPrefixAvatar = () => (
  <div style={surface}>
    <div style={headerRow}>
      <DialogHeader
        text="Connect a Claude account"
        subText="Symphony reads the local CLI session; no API key is stored in the app."
      >
        <Avatar slot="prefix" icon="claude" appearance="soft" variant="highlight" size="medium" />
      </DialogHeader>
    </div>
    <Divider />
    <Text
      text="Run claude login in a terminal, then return here and refresh the account list."
      wrap
    />
  </div>
);

export const TitleOnly = () => (
  <div style={surface}>
    <div style={headerRow}>
      <DialogHeader text="Discard unsaved storage limits?" />
    </div>
    <Divider />
    <div style={footerRow}>
      <Button label="Keep editing" appearance="plain" />
      <Button label="Discard" appearance="solid" variant="danger" />
    </div>
  </div>
);
