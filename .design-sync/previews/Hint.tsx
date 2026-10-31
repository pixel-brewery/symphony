import {
  Card,
  CardContent,
  CardHeader,
  Hint,
  ProgressBar,
  Stack,
  Text,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

export const FieldGuidance = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="tiny">
      <Textbox label="Repository" value="pixel-brewery/symphony" appearance="outline" />
      <Hint
        text="owner/name as it appears on GitHub. The binding is resolved when the workspace is created."
        textOverflow="wrap"
      />
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Textbox
        label="Managed workspace root"
        value="/home/example/.symphony/workspaces"
        appearance="outline"
      />
      <Hint
        text="Keep this path short — unix socket paths inside the workspace are limited to 104 characters."
        textOverflow="wrap"
      />
    </Stack>
  </Stack>
);

export const ProgressCaption = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Creating and classifying the issue draft…" wrap />
    <ProgressBar isIndeterminate variant="highlight" />
    <Hint
      text="The Analyzer is reading the repository before it proposes an implementation path."
      textOverflow="wrap"
    />
  </Stack>
);

export const CardMetadata = () => (
  <Card>
    <CardHeader
      text="SYM-482 · Normalise case-sensitive preview paths"
      subText="Ready · claude-opus"
    />
    <CardContent>
      <Stack orientation="vertical" gap="tiny">
        <Text text="Renderer file names diverge between macOS and the Linux runner." wrap />
        <Hint
          text="pixel-brewery/symphony · codex/fix-ci-case-paths · 4 files changed"
          textOverflow="wrap"
        />
      </Stack>
    </CardContent>
  </Card>
);

export const Truncation = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="tiny">
      <Text text='textOverflow="wrap"' wrap />
      <div style={{ width: '260px' }}>
        <Hint
          text="Execution 4f21c0 finished on codex/fix-ci-case-paths after 6 minutes and 12 seconds."
          textOverflow="wrap"
        />
      </div>
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text text='textOverflow="truncate"' wrap />
      <div style={{ width: '260px' }}>
        <Hint
          text="Execution 4f21c0 finished on codex/fix-ci-case-paths after 6 minutes and 12 seconds."
          textOverflow="truncate"
        />
      </div>
    </Stack>
  </Stack>
);
