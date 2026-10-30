import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  List,
  ListItem,
  Split,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// A split fills its container, so the preview has to give it a height.
const frame = { height: '380px', width: '100%', display: 'block' };
const pane = {
  padding: '12px',
  height: '100%',
  boxSizing: 'border-box' as const,
  overflow: 'hidden',
  background: 'var(--mosaik-scheme-surface)',
};

const workspaceRail = (
  <List selectionMode="none">
    <ListItem ripple={false}>
      <Text text="symphony" wrap />
      <Text text="3 worktrees · 8.2 GB" variant="neutral" wrap />
    </ListItem>
    <ListItem ripple={false}>
      <Text text="flamox365" wrap />
      <Text text="1 worktree · 2.4 GB" variant="neutral" wrap />
    </ListItem>
    <ListItem ripple={false}>
      <Text text="mosaik" wrap />
      <Text text="read-only reference" variant="neutral" wrap />
    </ListItem>
  </List>
);

export const WorkspaceRail = () => (
  <div style={frame}>
    <Split
      style={{ height: '100%' }}
      orientation="horizontal"
      position="70%"
      min="50%"
      max="80%"
      snaps={['50%', '70%']}
      collapsible
    >
      <div slot="start" style={pane}>
        <Card>
          <CardHeader text="SYM-431 Preview paths" subText="codex/fix-ci-case-paths · Codex" />
          <CardContent>
            <Stack orientation="vertical" gap="small">
              <Text text="The delivery finished and opened a pull request." wrap />
              <Stack orientation="horizontal" gap="small" verticalAlignment="center">
                <Chip label="In review" size="tiny" appearance="soft" variant="info" />
                <Chip label="Codex" size="tiny" appearance="soft" variant="neutral" />
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </div>
      <div slot="end" style={pane}>
        <Text text="Workspaces" variant="neutral" wrap />
        {workspaceRail}
      </div>
    </Split>
  </div>
);

export const VerticalPanes = () => (
  <div style={frame}>
    <Split style={{ height: '100%' }} orientation="vertical" position="55%" min="25%" max="75%">
      <div slot="start" style={pane}>
        <Text text="Execution log · exec-9f21" variant="neutral" wrap />
        <Stack orientation="vertical" gap="tiny">
          <Text text="12:04:11  Cloned pixel-brewery/symphony into the managed worktree." wrap />
          <Text text="12:04:38  Applied the solve-change-request skill." wrap />
          <Text text="12:06:02  Ran yarn nx run renderer:test." wrap />
          <Text text="12:10:42  Opened pull request #482." wrap />
        </Stack>
      </div>
      <div slot="end" style={pane}>
        <Text text="Changed files" variant="neutral" wrap />
        <Stack orientation="vertical" gap="tiny">
          <Text text="apps/renderer/src/app/App.html" wrap />
          <Text text="libs/frontend/core/src/commands/Command.ts" wrap />
          <Text text=".github/workflows/ci.yml" wrap />
        </Stack>
      </div>
    </Split>
  </div>
);

export const NestedPanes = () => (
  <div style={frame}>
    <Split style={{ height: '100%' }} orientation="horizontal" position="62%" min="30%" max="80%">
      <div slot="start" style={pane}>
        <Split orientation="vertical" position="50%" style={{ height: '100%' }}>
          <div slot="start" style={pane}>
            <Text text="Diff · Command.ts" variant="neutral" wrap />
            <Text text="+18 / -4 across 3 hunks" wrap />
          </div>
          <div slot="end" style={pane}>
            <Text text="Review comments" variant="neutral" wrap />
            <Text text="2 unresolved threads on the delivery branch." wrap />
          </div>
        </Split>
      </div>
      <div slot="end" style={pane}>
        <Text text="Workspaces" variant="neutral" wrap />
        {workspaceRail}
      </div>
    </Split>
  </div>
);
