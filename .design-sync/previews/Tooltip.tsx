import { Button, Dot, Icon, Stack, Text, Tooltip } from '@pixel-brewery/mosaik-elements-react';

export const OnAToolbarAction = () => (
  <div style={{ paddingTop: '140px', display: 'flex', justifyContent: 'center' }}>
    <Tooltip
      isOpen
      staysOpen
      trigger="manual"
      placement="top"
      content="Re-runs the failed CI workflow on codex/fix-ci-case-paths."
    >
      <Button label="Rerun checks" icon="sync" appearance="soft" variant="primary" />
    </Tooltip>
  </div>
);

export const OnATruncatedBranch = () => (
  <div style={{ paddingTop: '140px', paddingLeft: '40px', display: 'flex' }}>
    <Tooltip
      isOpen
      staysOpen
      trigger="manual"
      placement="right"
      content="symphony/desktop · codex/fix-ci-case-paths · 3 commits ahead of main"
    >
      <Text text="codex/fix-ci-case-paths" />
    </Tooltip>
  </div>
);

export const StorageLegend = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Storage breakdown legend — each entry explains itself on hover." wrap />
    <Stack orientation="horizontal" gap="medium" wrap>
      <Tooltip content="Git worktrees Symphony created for executions." placement="top">
        <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
          <Dot size="small" variant="primary" />
          <Text text="Workspaces · 12.1 GB" />
        </Stack>
      </Tooltip>
      <Tooltip content="Logs and transcripts kept for failed runs." placement="top">
        <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
          <Dot size="small" variant="warning" />
          <Text text="Artifacts · 4.2 GB" />
        </Stack>
      </Tooltip>
      <Tooltip content="Space the Mac free-space reserve keeps unused." placement="top">
        <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
          <Dot size="small" variant="neutral" fill="empty" />
          <Text text="Available · 2.1 GB" />
        </Stack>
      </Tooltip>
    </Stack>
    <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
      <Icon icon="info" size="small" variant="neutral" />
      <Text
        text="Tooltip is display: contents, so it never changes the row it wraps."
        variant="neutral"
        wrap
      />
    </Stack>
  </Stack>
);
