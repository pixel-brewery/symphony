import { Banner, Button, Stack } from '@pixel-brewery/mosaik-elements-react';

export const StorageAlarm = () => (
  <Banner
    isOpen
    fit="width"
    appearance="soft"
    variant="danger"
    icon="errorCircle"
    iconSize="small"
    header="Alarm: new disk-writing work is blocked"
    subHeader="Symphony stopped new AI tasks, worktrees, verification, and Local GitHub Actions. Clear managed data before continuing."
  />
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="info"
      icon="github"
      iconSize="small"
      header="Control Symphony from GitHub"
      subHeader="Comment @symphony in a configured issue to start analysis, implementation or a rerun."
    />
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="warning"
      icon="warning"
      iconSize="small"
      header="Homebrew is required for one-click installation"
      subHeader="Install Homebrew on this Mac, then refresh the developer tools list."
    />
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="success"
      icon="checkCircle"
      iconSize="small"
      header="Repository prepared"
      subHeader="symphony/desktop is set up for unattended work in the managed workspace root."
    />
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="danger"
      icon="errorCircle"
      iconSize="small"
      header="Automatic work is waiting for local preparation"
      subHeader="Prepare the repository under Repositories before unattended executions can start."
    />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="small">
    {(['soft', 'outline', 'plain'] as const).map((appearance) => (
      <Banner
        key={appearance}
        isOpen
        fit="width"
        appearance={appearance}
        variant="info"
        icon="info"
        iconSize="small"
        header={`${appearance} banner`}
        subHeader="Banners sit inside a settings card and explain a condition that blocks or changes automatic work."
      />
    ))}
  </Stack>
);

export const WithActions = () => (
  <Banner
    isOpen
    closeable
    fit="width"
    appearance="soft"
    variant="warning"
    icon="sparkle"
    iconSize="small"
    header="A newer workflow version is available"
    subHeader="Version 4 adds the automatic Qualified to Ready transition for items with a sole assignee."
  >
    <Stack slot="actions" orientation="horizontal" gap="small">
      <Button label="Review changes" appearance="plain" />
      <Button label="Adopt version 4" appearance="solid" variant="primary" />
    </Stack>
  </Banner>
);

export const DisabledAndNeutral = () => (
  <Stack orientation="vertical" gap="small">
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="neutral"
      icon="disconnect"
      iconSize="small"
      header="Board synchronisation paused"
      subHeader="Reconnect the GitHub account to resume pulling work items."
    />
    <Banner
      isOpen
      disabled
      fit="width"
      appearance="soft"
      variant="neutral"
      icon="executionOutline"
      iconSize="small"
      header="Disabled — the setting this banner explains is switched off"
      subHeader="Agentic delivery is off, so the repair steps below have no effect."
    />
  </Stack>
);
