import { Icon, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

// Symphony registers a fixed vocabulary; any other name renders nothing at all.
const navigation = [
  ['board', 'Board'],
  ['flow', 'Deliveries'],
  ['executionOutline', 'Executions'],
  ['skills', 'Skills'],
  ['folder', 'Workspaces'],
  ['settings', 'Settings'],
] as const;

const labelled = (icon: string, label: string, extra?: Record<string, unknown>) => (
  <Stack key={icon + label} orientation="vertical" gap="tiny" horizontalAlignment="center">
    <Icon icon={icon} size="large" {...extra} />
    <Text text={label} variant="neutral" />
  </Stack>
);

export const NavigationIcons = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {navigation.map(([icon, label]) => labelled(icon, label))}
  </Stack>
);

export const ProviderIcons = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {labelled('github', 'GitHub')}
    {labelled('claude', 'Claude')}
    {labelled('openai', 'Codex')}
    {labelled('azureDevOps', 'Azure DevOps')}
    {labelled('bot', 'Agent')}
  </Stack>
);

export const Variants = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {labelled('checkCircle', 'Succeeded', { variant: 'success' })}
    {labelled('play', 'Running', { variant: 'info' })}
    {labelled('warning', 'Blocked', { variant: 'warning' })}
    {labelled('error', 'Failed', { variant: 'danger' })}
    {labelled('sync', 'Queued', { variant: 'neutral' })}
    {labelled('sparkle', 'Suggested', { variant: 'primary' })}
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {(['tiny', 'small', 'medium', 'large', 'giant'] as const).map((size) => (
      <Stack key={size} orientation="vertical" gap="tiny" horizontalAlignment="center">
        <Icon icon="branch" size={size} variant="primary" />
        <Text text={size} variant="neutral" />
      </Stack>
    ))}
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {(['default', 'outline', 'soft', 'solid', 'plain'] as const).map((appearance) => (
      <Stack key={appearance} orientation="vertical" gap="tiny" horizontalAlignment="center">
        <Icon icon="github" size="large" appearance={appearance} variant="primary" />
        <Text text={appearance} variant="neutral" />
      </Stack>
    ))}
  </Stack>
);
