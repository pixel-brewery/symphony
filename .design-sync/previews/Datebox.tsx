import { Datebox, Icon, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const TargetDate = () => (
  <Datebox
    label="Target date"
    value={new Date('2026-09-18T00:00:00Z')}
    isClearable
    dropDownPlacement="bottom-end"
  />
);

export const ProjectFields = () => (
  <Stack orientation="vertical" gap="medium">
    <Datebox label="Start date" value={new Date('2026-09-03T00:00:00Z')} isClearable />
    <Datebox label="Target date" value={new Date('2026-09-18T00:00:00Z')} isClearable />
    <Datebox label="Review deadline" value={new Date('2026-09-25T00:00:00Z')} isClearable>
      <Icon slot="prefix" icon="clipboardTask" size="small" appearance="plain" />
    </Datebox>
    <Text
      text="Project fields are written back to the linked GitHub item."
      variant="neutral"
      wrap
    />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    <Datebox label="Default" appearance="default" value={new Date('2026-09-18T00:00:00Z')} />
    <Datebox label="Outline" appearance="outline" value={new Date('2026-09-18T00:00:00Z')} />
    <Datebox label="Soft" appearance="soft" value={new Date('2026-09-18T00:00:00Z')} />
    <Datebox label="Solid" appearance="solid" value={new Date('2026-09-18T00:00:00Z')} />
    <Datebox label="Plain" appearance="plain" value={new Date('2026-09-18T00:00:00Z')} />
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Datebox label="Target date" value={new Date('2026-09-18T00:00:00Z')} state="valid" />
    <Datebox
      label="Target date"
      value={new Date('2026-08-01T00:00:00Z')}
      state="invalid"
      invalid
      required
    />
    <Datebox label="Locked by the workflow" value={new Date('2026-09-18T00:00:00Z')} readonly />
    <Datebox label="No project attached" value={new Date('2026-09-18T00:00:00Z')} disabled />
  </Stack>
);

export const OpenCalendar = () => (
  <Datebox
    label="Target date"
    value={new Date('2026-09-18T00:00:00Z')}
    isDropDownOpen
    dropDownStaysOpen
    dropDownPlacement="bottom-start"
  />
);
