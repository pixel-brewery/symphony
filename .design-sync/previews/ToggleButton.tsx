import { Stack, Text, ToggleButton } from '@pixel-brewery/mosaik-elements-react';

export const BoardViewModes = () => (
  <Stack orientation="horizontal" gap="4px" wrap="wrap" verticalAlignment="center">
    <ToggleButton label="Board" icon="board" appearance="plain" isChecked />
    <ToggleButton label="Deliveries" icon="flow" appearance="plain" />
    <ToggleButton label="Executions" icon="executionOutline" appearance="plain" />
    <ToggleButton label="Skills" icon="skills" appearance="plain" />
  </Stack>
);

export const CheckedAndUnchecked = () => (
  <Stack orientation="vertical" gap="medium">
    {(['outline', 'soft', 'solid', 'plain'] as const).map((appearance) => (
      <Stack key={appearance} orientation="horizontal" gap="8px" verticalAlignment="center">
        <Text text={appearance} variant="neutral" />
        <ToggleButton label="Unattended" appearance={appearance} variant="primary" isChecked />
        <ToggleButton label="Unattended" appearance={appearance} variant="primary" />
      </Stack>
    ))}
  </Stack>
);

export const IconOnlyToggles = () => (
  <Stack orientation="horizontal" gap="4px" wrap="wrap" verticalAlignment="center">
    <ToggleButton icon="mic" appearance="plain" size="small" iconSize="medium" isChecked />
    <ToggleButton icon="eyeShow" appearance="plain" size="small" iconSize="medium" />
    <ToggleButton icon="filter" appearance="plain" size="small" iconSize="medium" isChecked />
    <ToggleButton icon="panelRight" appearance="plain" size="small" iconSize="medium" />
    <ToggleButton icon="weatherMoon" appearance="plain" size="small" iconSize="medium" />
  </Stack>
);

export const States = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <ToggleButton label="Auto-deliver" icon="sparkle" appearance="outline" isChecked />
    <ToggleButton label="Saving" appearance="outline" isBusy />
    <ToggleButton label="Locked on" appearance="outline" isChecked disabled />
    <ToggleButton label="Locked off" appearance="outline" disabled />
  </Stack>
);
