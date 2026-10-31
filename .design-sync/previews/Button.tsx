import { Button, Stack } from '@pixel-brewery/mosaik-elements-react';

export const Variants = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <Button label="Start delivery" variant="primary" />
    <Button label="Save draft" variant="secondary" />
    <Button label="Discard" variant="danger" />
    <Button label="Details" variant="neutral" />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <Button label="Solid" variant="primary" appearance="solid" />
    <Button label="Soft" variant="primary" appearance="soft" />
    <Button label="Outline" variant="primary" appearance="outline" />
    <Button label="Plain" variant="primary" appearance="plain" />
  </Stack>
);

export const WithIcons = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <Button label="Run skill" icon="play" variant="primary" />
    <Button label="Open repository" icon="open" iconPosition="after" variant="secondary" />
    <Button icon="settings" variant="neutral" appearance="plain" />
  </Stack>
);

export const States = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <Button label="Working" variant="primary" isBusy />
    <Button label="Unavailable" variant="primary" disabled />
    <Button label="Sizes" variant="secondary" size="small" />
    <Button label="Sizes" variant="secondary" size="large" />
  </Stack>
);
