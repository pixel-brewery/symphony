import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Hint,
  Sheet,
  SheetContent,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// A sheet is fixed to the surface it covers, so a preview needs a frame with a
// real height: the sheet sizes itself against that box and the backdrop dims
// the screen behind it.
const screen = {
  position: 'relative' as const,
  width: '100%',
  height: '620px',
  overflow: 'hidden',
  background: 'var(--mosaik-scheme-background)',
};

const Behind = () => (
  <Stack orientation="vertical" gap="small" style={{ padding: '16px' }}>
    <Text text="Board" wrap />
    <Card>
      <CardHeader
        text="SYM-482 · Normalise case-sensitive preview paths"
        subText="Ready · claude-opus"
      />
      <CardContent text="Renderer file names diverge between macOS and the Linux runner." />
    </Card>
    <Card>
      <CardHeader text="SYM-479 · Persist adopted workflow versions" subText="In review · codex" />
      <CardContent text="Adopted workflow versions must survive a settings reload." />
    </Card>
  </Stack>
);

export const WorkspaceRailSheet = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen closeable hasBackdrop dragMode="handle" width="100%" height="440px">
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          <Text text="Workspaces" wrap />
          <Hint text="18.4 GB across 6 workspaces · 2.1 GB reclaimable" textOverflow="wrap" />
          <Divider />
          {[
            ['symphony', '8.2 GB · 3 executions today'],
            ['mosaik', '6.1 GB · 1 execution today'],
            ['flamox', '4.1 GB · no executions'],
          ].map(([name, meta]) => (
            <Stack
              key={name}
              orientation="horizontal"
              gap="small"
              verticalAlignment="center"
              fit="width"
            >
              <Avatar icon="folder" size="tiny" appearance="soft" />
              <Stack orientation="vertical" gap="tiny">
                <Text text={name} wrap />
                <Hint text={meta} textOverflow="wrap" />
              </Stack>
            </Stack>
          ))}
        </Stack>
      </SheetContent>
    </Sheet>
  </div>
);

export const ConfirmationSheet = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle width="100%" height="220px">
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          <Text text="Start delivery for SYM-482?" wrap />
          <Hint
            text="claude-opus branches from main and opens a pull request when it finishes."
            textOverflow="wrap"
          />
          <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
            <Button label="Cancel" variant="neutral" appearance="outline" />
            <Button label="Start delivery" variant="primary" appearance="solid" icon="play" />
          </Stack>
        </Stack>
      </SheetContent>
    </Sheet>
  </div>
);

export const WithHeaderAndFooter = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle width="100%" height="400px">
      <Stack
        slot="header"
        orientation="horizontal"
        gap="small"
        verticalAlignment="center"
        fit="width"
      >
        <Avatar icon="executionOutline" size="tiny" appearance="soft" />
        <Stack orientation="vertical" gap="tiny">
          <Text text="Execution 4f21c0" wrap />
          <Hint text="agentic-delivery · streaming for 6m 12s" textOverflow="wrap" />
        </Stack>
        <Stack orientation="horizontal" gap="tiny" horizontalAlignment="right" fit="width">
          <Chip label="Streaming" appearance="soft" size="small" variant="info" />
        </Stack>
      </Stack>
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          <Text text="12:05:02  218 files scanned" wrap />
          <Text text="12:06:44  4 files renamed" wrap />
          <Text text="12:07:30  Lint passed in 42s" wrap />
        </Stack>
      </SheetContent>
      <Stack
        slot="footer"
        orientation="horizontal"
        gap="small"
        horizontalAlignment="right"
        fit="width"
      >
        <Button label="Stop execution" variant="danger" appearance="outline" icon="clear" />
        <Button label="Open pull request" variant="primary" appearance="solid" icon="open" />
      </Stack>
    </Sheet>
  </div>
);

export const TopPosition = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle position="top" width="100%" height="240px">
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          <Text text="Board data is stale" wrap />
          <Hint
            text="The last GitHub sync failed 12 minutes ago. Deliveries run against the cached snapshot."
            textOverflow="wrap"
          />
          <Stack orientation="horizontal" gap="small">
            <Button label="Retry sync" variant="primary" appearance="solid" icon="sync" />
            <Button label="Dismiss" variant="neutral" appearance="plain" />
          </Stack>
        </Stack>
      </SheetContent>
    </Sheet>
  </div>
);
