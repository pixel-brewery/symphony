import { Avatar, Badge, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const BoardItemStatus = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Runtime state on a board card" wrap />
    <Stack orientation="horizontal" gap="small" wrap>
      <Badge appearance="soft" variant="primary" label="Analyzing" size="small" />
      <Badge appearance="soft" variant="info" label="Queued" size="small" />
      <Badge appearance="soft" variant="warning" label="Synchronizing" size="small" />
      <Badge appearance="soft" variant="success" label="Delivered" size="small" />
      <Badge appearance="soft" variant="danger" label="Analysis failed" size="small" />
      <Badge appearance="soft" variant="neutral" label="No claim" size="small" />
    </Stack>
    <Text text="Skill capabilities, as Settings renders them" wrap />
    <Stack orientation="horizontal" gap="small" wrap>
      <Badge appearance="outline" label="Reads only" />
      <Badge appearance="outline" label="Changes files" />
      <Badge appearance="outline" label="Publishes pull requests" />
    </Stack>
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="large">
    {(['soft', 'outline', 'plain', 'solid'] as const).map((appearance) => (
      <Stack key={appearance} orientation="vertical" gap="tiny">
        <Text text={appearance} variant="neutral" wrap />
        <Stack orientation="horizontal" gap="small" wrap>
          <Badge appearance={appearance} variant="primary" label="Running" />
          <Badge appearance={appearance} variant="success" label="Merged" />
          <Badge appearance={appearance} variant="warning" label="Conflicts" />
          <Badge appearance={appearance} variant="info" label="Draft" />
        </Stack>
      </Stack>
    ))}
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="vertical" gap="medium">
    {(['small', 'medium', 'large', 'giant'] as const).map((size) => (
      <Stack key={size} orientation="horizontal" gap="small" verticalAlignment="center">
        <Badge appearance="soft" variant="primary" size={size} label={`${size} · 3 tickets`} />
      </Stack>
    ))}
  </Stack>
);

export const WithIcon = () => (
  <Stack orientation="horizontal" gap="small" wrap>
    <Badge appearance="soft" variant="neutral" icon="branch" label="codex/fix-ci-case-paths" />
    <Badge appearance="soft" variant="highlight" icon="sparkle" label="AI" />
    <Badge appearance="soft" variant="success" icon="checkmarkCircle" label="Checks passed" />
    <Badge appearance="soft" variant="danger" icon="warning" label="Out of quota" />
  </Stack>
);

const anchor = { position: 'relative', display: 'inline-block', width: 'fit-content' } as const;

export const AttachedPositions = () => {
  return (
    <Stack
      orientation="horizontal"
      gap="giant"
      verticalAlignment="center"
      horizontalAlignment="left"
    >
      {(['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const).map((position) => (
        <Stack key={position} orientation="vertical" gap="small" horizontalAlignment="left">
          <div style={anchor}>
            <Avatar size="large" appearance="soft" icon="person" />
            <Badge
              attached
              position={position}
              appearance="solid"
              variant="primary"
              size="small"
              label="4"
            />
          </div>
          <Text text={position} variant="neutral" readonly />
        </Stack>
      ))}
    </Stack>
  );
};
