import {
  Avatar,
  Button,
  Chip,
  Divider,
  Hint,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// Stack is the layout primitive; these frames only exist so the reader can see
// where a stack ends and how its alignment props move content inside it.
const frame = {
  border: '1px solid var(--mosaik-scheme-middlelight)',
  borderRadius: 'var(--mosaik-layout-radius)',
  padding: '10px',
  background: 'var(--mosaik-scheme-surface)',
};
const tallFrame = { ...frame, height: '110px' };

export const WorkItemRow = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" fit="width">
    <Avatar text="AW" size="small" appearance="soft" />
    <Stack orientation="vertical" gap="tiny">
      <Text text="SYM-482 · Normalise case-sensitive preview paths" wrap />
      <Hint text="pixel-brewery/symphony · codex/fix-ci-case-paths" textOverflow="wrap" />
    </Stack>
    <Stack orientation="horizontal" gap="tiny" horizontalAlignment="right" fit="width">
      <Chip label="In review" variant="info" appearance="soft" size="small" />
      <Button icon="open" appearance="plain" variant="neutral" />
    </Stack>
  </Stack>
);

export const Orientations = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="top">
    <div style={frame}>
      <Stack orientation="vertical" gap="small">
        <Hint text='orientation="vertical"' />
        <Button label="Analyse" icon="sparkle" appearance="outline" variant="neutral" />
        <Button label="Deliver" icon="play" appearance="outline" variant="neutral" />
        <Button label="Review" icon="checkmarkCircle" appearance="outline" variant="neutral" />
      </Stack>
    </div>
    <div style={frame}>
      <Stack orientation="vertical" gap="small">
        <Hint text='orientation="horizontal"' />
        <Stack orientation="horizontal" gap="small">
          <Button label="Analyse" icon="sparkle" appearance="outline" variant="neutral" />
          <Button label="Deliver" icon="play" appearance="outline" variant="neutral" />
          <Button label="Review" icon="checkmarkCircle" appearance="outline" variant="neutral" />
        </Stack>
      </Stack>
    </div>
  </Stack>
);

export const Gaps = () => (
  <Stack orientation="vertical" gap="medium">
    {(['tiny', 'small', 'medium', 'large', 'giant'] as const).map((gap) => (
      <Stack key={gap} orientation="vertical" gap="tiny">
        <Hint text={`gap="${gap}"`} />
        <Stack orientation="horizontal" gap={gap}>
          <Chip label="Qualified" appearance="soft" size="small" />
          <Chip label="Ready" appearance="soft" size="small" />
          <Chip label="Delivered" appearance="soft" size="small" />
        </Stack>
      </Stack>
    ))}
  </Stack>
);

export const Alignment = () => (
  <Stack orientation="vertical" gap="medium">
    {(['left', 'center', 'right'] as const).map((horizontalAlignment) => (
      <Stack key={horizontalAlignment} orientation="vertical" gap="tiny">
        <Hint text={`horizontalAlignment="${horizontalAlignment}"`} />
        <div style={frame}>
          <Stack
            orientation="horizontal"
            gap="small"
            fit="width"
            horizontalAlignment={horizontalAlignment}
          >
            <Button label="Discard draft" variant="neutral" appearance="outline" />
            <Button label="Create work item" variant="primary" appearance="solid" icon="add" />
          </Stack>
        </div>
      </Stack>
    ))}
    <Divider />
    <Stack orientation="horizontal" gap="medium" verticalAlignment="stretch">
      {(['top', 'center', 'bottom'] as const).map((verticalAlignment) => (
        <Stack key={verticalAlignment} orientation="vertical" gap="tiny" fit="width">
          <Hint text={`verticalAlignment="${verticalAlignment}"`} />
          <div style={tallFrame}>
            <Stack
              orientation="horizontal"
              gap="small"
              fit="both"
              verticalAlignment={verticalAlignment}
            >
              <Avatar text="CL" size="small" appearance="soft" />
              <Text text="claude-opus" wrap />
            </Stack>
          </div>
        </Stack>
      ))}
    </Stack>
  </Stack>
);

export const Wrapping = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Active board filters" wrap />
    <div style={{ ...frame, width: '360px' }}>
      <Stack orientation="horizontal" gap="tiny" wrap>
        <Chip label="Repository: symphony" appearance="soft" size="small" icon="github" />
        <Chip label="Agent: claude-opus" appearance="soft" size="small" icon="claude" />
        <Chip label="Agent: codex" appearance="soft" size="small" icon="openai" />
        <Chip label="Stage: Ready" appearance="soft" size="small" icon="board" />
        <Chip label="Skill: repository-investigator" appearance="soft" size="small" icon="skills" />
        <Chip label="Has open pull request" appearance="soft" size="small" icon="branch" />
      </Stack>
    </div>
    <Hint
      text="wrap keeps a filter row inside its column instead of overflowing it."
      textOverflow="wrap"
    />
  </Stack>
);
