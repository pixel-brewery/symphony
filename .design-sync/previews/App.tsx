import {
  App,
  AppHeader,
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Hint,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// App is the whole window: its own stylesheet pins it to 100vw/100vh, so a
// preview frames it and lets it fill that frame instead.
// `--window-controls-overlay-right` is the inset Symphony reserves for the
// native window buttons; the header's trailing actions sit inside it.
const frame = {
  position: 'relative' as const,
  width: '100%',
  height: '620px',
  '--window-controls-overlay-right': '16px',
};
const fill = { position: 'relative' as const, width: '100%', height: '100%' };
// The header floats over the content, so the first content row is inset by its
// height — the same 64px strip Symphony reserves.
const content = { padding: '64px 16px 16px' };

const navButton = (icon: string, label: string) => (
  <Button
    key={label}
    icon={icon}
    label={label}
    appearance="plain"
    variant="neutral"
    fit="width"
    horizontalContentAlignment="left"
  />
);

const Brand = () => (
  <Stack slot="brand" orientation="horizontal" gap="small" verticalAlignment="center">
    <Avatar icon="github" size="tiny" appearance="soft" />
    <Text text="pixel-brewery/symphony" wrap />
    <Chip label="main" icon="branch" appearance="soft" size="tiny" />
  </Stack>
);

export const NavigationCollapsed = () => (
  <div style={frame}>
    <App style={fill} hasHeader hasNav isNavOpen={false}>
      <AppHeader>
        <Button slot="menu" icon="panelLeft" appearance="plain" variant="neutral" />
        <Brand />
        <Button
          slot="actions"
          icon="add"
          label="New work item"
          appearance="outline"
          variant="neutral"
        />
      </AppHeader>

      <Stack slot="nav" orientation="vertical" gap="tiny" style={{ padding: '64px 10px 10px' }}>
        {navButton('board', 'Board')}
        {navButton('flow', 'Deliveries')}
      </Stack>

      <Stack slot="content" orientation="vertical" gap="medium" style={content}>
        <Text text="Board" wrap />
        <Card>
          <CardHeader
            text="SYM-482 · Normalise case-sensitive preview paths"
            subText="Ready · claude-opus"
          />
          <CardContent text="With the navigation drawer closed the content takes the full window width." />
        </Card>
        <Card>
          <CardHeader
            text="SYM-461 · Shorten managed workspace paths"
            subText="Qualified · unassigned"
          />
          <CardContent text="Delivery failures traced to the unix socket path length limit." />
        </Card>
      </Stack>
    </App>
  </div>
);

export const ContentAndRail = () => (
  <div style={frame}>
    {/* Symphony itself runs hasNav={false} and keeps its workspace rail beside the content. */}
    <App style={fill} hasHeader hasNav={false}>
      <AppHeader>
        <Brand />
        <Button
          slot="actions"
          icon="sync"
          label="Sync board"
          appearance="outline"
          variant="neutral"
        />
      </AppHeader>

      <Stack slot="content" orientation="vertical" gap="medium" style={content}>
        <Text text="Executions" wrap />
        <Card>
          <CardHeader text="4f21c0 · repository-investigator" subText="Streaming · 6m 12s" />
          <CardContent text="Reading apps/renderer/src — 218 files scanned." />
        </Card>
        <Card>
          <CardHeader text="9ab310 · agentic-delivery" subText="Completed · 11m 04s" />
          <CardContent text="Pull request #1284 opened on codex/fix-ci-case-paths." />
        </Card>
      </Stack>

      <Stack
        slot="rail"
        orientation="vertical"
        gap="small"
        style={{ padding: '64px 12px 12px', width: '240px' }}
      >
        <Text text="Workspace" wrap />
        <Hint text="symphony · 8.2 GB · 3 executions today" textOverflow="wrap" />
        <Divider />
        <Stack orientation="horizontal" gap="tiny" wrap>
          <Chip label="claude-opus" icon="claude" appearance="soft" size="small" />
          <Chip label="codex" icon="openai" appearance="soft" size="small" />
        </Stack>
      </Stack>
    </App>
  </div>
);

export const WithFooter = () => (
  <div style={frame}>
    <App style={fill} hasHeader hasNav={false}>
      <AppHeader>
        <Brand />
        <Button slot="actions" icon="settings" appearance="plain" variant="neutral" />
      </AppHeader>

      <Stack slot="content" orientation="vertical" gap="medium" style={content}>
        <Text text="Skills" wrap />
        <Card>
          <CardHeader text="repository-investigator" subText="Portable skill · 3 workspaces" />
          <CardContent text="Locates owning code, configuration and reference patterns before implementation." />
        </Card>
        <Card>
          <CardHeader text="agentic-delivery" subText="Portable skill · 6 workspaces" />
          <CardContent text="Implements an approved change request in a managed worktree and opens the pull request." />
        </Card>
      </Stack>

      <Stack
        slot="footer"
        orientation="horizontal"
        gap="small"
        verticalAlignment="center"
        style={{ padding: '8px 16px' }}
      >
        <Hint text="Last GitHub sync 2 minutes ago" textOverflow="wrap" />
        <Stack orientation="horizontal" gap="tiny" horizontalAlignment="right" fit="width">
          <Chip
            label="3 executions running"
            icon="executionOutline"
            appearance="soft"
            size="tiny"
            variant="info"
          />
        </Stack>
      </Stack>
    </App>
  </div>
);
