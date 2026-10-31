import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Hint,
  Sheet,
  SheetContent,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// SheetContent is the scrollable body of a sheet; it assigns itself to the
// sheet's `content` slot. The frame gives the fixed sheet a surface to sit on.
const screen = {
  position: 'relative' as const,
  width: '100%',
  height: '620px',
  overflow: 'hidden',
  background: 'var(--mosaik-scheme-background)',
};

const Behind = () => (
  <Stack orientation="vertical" gap="small" style={{ padding: '16px' }}>
    <Text text="Deliveries" wrap />
    <Card>
      <CardHeader
        text="SYM-482 · Normalise case-sensitive preview paths"
        subText="Ready · claude-opus"
      />
      <CardContent text="Renderer file names diverge between macOS and the Linux runner." />
    </Card>
  </Stack>
);

export const PlainText = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle width="100%" height="260px">
      <SheetContent
        slot="content"
        text="Symphony could not reach GitHub for 12 minutes. Board data is served from the cached snapshot and deliveries are paused until the next successful sync."
      />
    </Sheet>
  </div>
);

export const ComposedContent = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle width="100%" height="420px">
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          <Text text="SYM-482 · Normalise case-sensitive preview paths" wrap />
          <Hint text="Ready · claude-opus · pixel-brewery/symphony" textOverflow="wrap" />
          <Divider />
          <Text
            text="Renderer file names diverge between macOS and the Linux runner, so imports resolve locally and fail in CI."
            wrap
          />
          <Stack orientation="horizontal" gap="small">
            <Button label="Open work item" variant="neutral" appearance="outline" icon="open" />
            <Button label="Start delivery" variant="primary" appearance="solid" icon="play" />
          </Stack>
        </Stack>
      </SheetContent>
    </Sheet>
  </div>
);

export const LongBody = () => (
  <div style={screen}>
    <Behind />
    <Sheet isOpen hasBackdrop hasHandle width="100%" height="380px">
      <SheetContent slot="content">
        <Stack orientation="vertical" gap="small">
          {[
            ['12:04:01', 'Workspace prepared'],
            ['12:04:18', 'Skill resolved: repository-investigator'],
            ['12:05:02', 'Reading apps/renderer/src — 218 files scanned'],
            ['12:06:44', 'Renamed 4 preview files with git mv'],
            ['12:07:30', 'yarn nx run renderer:lint passed in 42s'],
            ['12:09:11', 'yarn nx run renderer:test passed in 1m 18s'],
            ['12:10:52', 'Commit pushed to codex/fix-ci-case-paths'],
            ['12:11:26', 'Pull request #1284 opened · Closes SYM-482'],
          ].map(([at, line]) => (
            <Text key={at} text={`${at}  ${line}`} wrap />
          ))}
        </Stack>
      </SheetContent>
    </Sheet>
  </div>
);
