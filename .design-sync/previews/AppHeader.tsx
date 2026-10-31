import {
  App,
  AppHeader,
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Searchbox,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// AppHeader belongs to the application shell: it assigns itself to the App's
// `header` slot, and only the shell gives it the surface it floats on. Outside
// an App it has nothing to attach to.
// `--window-controls-overlay-right` is the inset Symphony reserves for the
// native window buttons; the header's trailing actions sit inside it.
const frame = {
  position: 'relative' as const,
  width: '100%',
  height: '420px',
  '--window-controls-overlay-right': '16px',
};
const fill = { position: 'relative' as const, width: '100%', height: '100%' };
const content = { padding: '64px 16px 16px' };

const Board = () => (
  <Stack slot="content" orientation="vertical" gap="medium" style={content}>
    <Card>
      <CardHeader
        text="SYM-482 · Normalise case-sensitive preview paths"
        subText="Ready · claude-opus"
      />
      <CardContent text="Renderer file names diverge between macOS and the Linux runner." />
    </Card>
  </Stack>
);

export const WorkspaceHeader = () => (
  <div style={frame}>
    <App style={fill} hasHeader hasNav={false}>
      <AppHeader>
        <Button slot="menu" icon="panelLeft" appearance="plain" variant="neutral" />
        <Stack slot="brand" orientation="horizontal" gap="small" verticalAlignment="center">
          <Avatar icon="github" size="tiny" appearance="soft" />
          <Text text="pixel-brewery/symphony" wrap />
          <Chip label="main" icon="branch" appearance="soft" size="tiny" />
        </Stack>
        <Stack slot="actions" orientation="horizontal" gap="tiny" verticalAlignment="center">
          <Button icon="sync" appearance="plain" variant="neutral" />
          <Button icon="weatherMoon" appearance="plain" variant="neutral" />
          <Button icon="settings" appearance="plain" variant="neutral" />
          <Avatar text="AW" size="tiny" appearance="soft" />
        </Stack>
      </AppHeader>
      <Board />
    </App>
  </div>
);

export const Busy = () => (
  <div style={frame}>
    <App style={fill} hasHeader hasNav={false}>
      <AppHeader isBusy>
        <Button slot="menu" icon="panelLeft" appearance="plain" variant="neutral" />
        <Stack slot="brand" orientation="horizontal" gap="small" verticalAlignment="center">
          <Avatar icon="github" size="tiny" appearance="soft" />
          <Text text="pixel-brewery/symphony" wrap />
          <Chip label="Syncing board" icon="sync" appearance="soft" size="tiny" variant="info" />
        </Stack>
        <Button
          slot="actions"
          icon="clear"
          label="Cancel sync"
          appearance="plain"
          variant="neutral"
        />
      </AppHeader>
      <Board />
    </App>
  </div>
);

export const WithGlobalSearch = () => (
  <div style={frame}>
    <App style={fill} hasHeader hasNav={false}>
      <AppHeader>
        <Button slot="menu" icon="panelLeftContract" appearance="plain" variant="neutral" />
        <Searchbox
          slot="brand"
          placeholder="Search work items"
          appearance="soft"
          style={{ width: '320px' }}
        />
        <Stack slot="actions" orientation="horizontal" gap="tiny" verticalAlignment="center">
          <Button icon="add" label="New work item" appearance="outline" variant="neutral" />
          <Avatar text="AW" size="tiny" appearance="soft" />
        </Stack>
      </AppHeader>
      <Board />
    </App>
  </div>
);
