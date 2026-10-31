import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Hint,
  Stack,
  Text,
  ToggleSwitch,
} from '@pixel-brewery/mosaik-elements-react';

export const SettingsSections = () => (
  <Card>
    <CardHeader text="Runtime" subText="How Symphony schedules and cleans up unattended work." />
    <CardContent>
      <Stack orientation="vertical" gap="small">
        <Text text="Workspaces" />
        <ToggleSwitch variant="primary" isChecked label="Retain failed execution workspaces" />
        <Divider />
        <Text text="GitHub issue control" />
        <ToggleSwitch variant="primary" label="Allow GitHub commands" />
        <Divider />
        <Text text="Autonomous work" />
        <ToggleSwitch variant="primary" isChecked label="Run autonomous work" />
        <Hint text="A divider separates the settings groups inside one card." textOverflow="wrap" />
      </Stack>
    </CardContent>
  </Card>
);

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'stretch', height: '24px', gap: '12px' }}>
    <Text text="codex/fix-ci-case-paths" />
    <Divider orientation="vertical" />
    <Text text="3 commits" variant="neutral" />
    <Divider orientation="vertical" />
    <Text text="CI green" variant="success" />
    <Divider orientation="vertical" />
    <Text text="Opened 2 hours ago" variant="neutral" />
  </div>
);

export const Thickness = () => (
  <Stack orientation="vertical" gap="small">
    {[1, 2, 4].map((thickness) => (
      <Stack key={thickness} orientation="vertical" gap="small">
        <Text text={`thickness=${thickness} — separates the execution log from its summary`} wrap />
        <Divider thickness={thickness} />
      </Stack>
    ))}
    <Text text="The last section closes the list." wrap />
  </Stack>
);

export const BetweenBoardEntries = () => (
  <Stack orientation="vertical" gap="small">
    <Stack orientation="vertical" gap="tiny">
      <Text text="SYM-214 · Keep renamed file paths case-sensitive" wrap />
      <Text text="Claude · delivered · pull request #482" variant="neutral" wrap />
    </Stack>
    <Divider />
    <Stack orientation="vertical" gap="tiny">
      <Text text="SYM-215 · Adopt workflow version 4" wrap />
      <Text text="Codex · running · started 6 minutes ago" variant="neutral" wrap />
    </Stack>
    <Divider />
    <Stack orientation="vertical" gap="tiny">
      <Text text="SYM-216 · Shorten the managed workspace path" wrap />
      <Text text="Unassigned · qualified" variant="neutral" wrap />
    </Stack>
  </Stack>
);
