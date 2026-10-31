import { Button, Stack, Toolbar } from '@pixel-brewery/mosaik-elements-react';

export const BoardActions = () => (
  <Toolbar appearance="soft" variant="neutral" fit="width" title="Board">
    <Button slot="start" icon="add" appearance="solid" variant="primary" label="Create work item" />
    <Button slot="end" icon="filter" appearance="soft" variant="neutral" label="Filter" />
    <Button slot="end" icon="sync" appearance="soft" variant="neutral" label="Synchronise" />
  </Toolbar>
);

export const WithTitle = () => (
  <Toolbar
    appearance="soft"
    variant="neutral"
    fit="width"
    title="Executions"
    subTitle="6 runs today · 1 still streaming"
  >
    <Button slot="start" icon="panelLeft" appearance="plain" variant="neutral" />
    <Button
      slot="end"
      icon="executionOutline"
      appearance="plain"
      variant="neutral"
      label="Open log"
    />
  </Toolbar>
);

export const DeliverySelection = () => (
  <Toolbar appearance="soft" variant="neutral" fit="width" title="3 items selected">
    <Button slot="start" icon="clear" appearance="plain" variant="neutral" />
    <Button slot="end" icon="play" appearance="solid" variant="primary" label="Start delivery" />
  </Toolbar>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="small">
    {(['soft', 'outline', 'plain'] as const).map((appearance) => (
      <Toolbar
        key={appearance}
        appearance={appearance}
        variant="neutral"
        fit="width"
        title={appearance}
      >
        <Button slot="start" icon="board" appearance="plain" variant="neutral" />
        <Button slot="end" icon="settings" appearance="plain" variant="neutral" label="Settings" />
      </Toolbar>
    ))}
  </Stack>
);
