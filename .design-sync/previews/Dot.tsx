import { Dot, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

const row = (
  variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary',
  label: string,
  detail: string,
) => (
  <Stack key={label} orientation="horizontal" gap="small" verticalAlignment="center">
    <Dot variant={variant} size="small" fill="full" />
    <Text text={label} />
    <Text text={detail} variant="neutral" />
  </Stack>
);

export const ExecutionStatus = () => (
  <Stack orientation="vertical" gap="small">
    {row('info', 'Running', 'exec-9f24 · Claude · 2m 11s')}
    {row('success', 'Succeeded', 'exec-9f21 · Claude · 6m 31s')}
    {row('warning', 'Cancelled', 'exec-9f18 · Codex · 0m 44s')}
    {row('danger', 'Failed', 'exec-9f14 · Claude · 11m 03s')}
    {row('neutral', 'Queued', 'exec-9f25 · Codex · waiting for a worktree')}
  </Stack>
);

export const FillStates = () => (
  <Stack orientation="vertical" gap="small">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Dot variant="primary" size="medium" fill="empty" />
      <Text text="empty · no delivery started" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Dot variant="primary" size="medium" fill="half" />
      <Text text="half · analysis done, implementation running" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Dot variant="primary" size="medium" fill="full" />
      <Text text="full · delivery complete" wrap />
    </Stack>
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="horizontal" gap="large" wrap="wrap" verticalAlignment="center">
    {(['tiny', 'small', 'medium', 'large', 'giant'] as const).map((size) => (
      <Stack key={size} orientation="vertical" gap="tiny" horizontalAlignment="center">
        <Dot variant="primary" size={size} fill="full" />
        <Text text={size} variant="neutral" />
      </Stack>
    ))}
  </Stack>
);

export const StepProgress = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Dot variant="success" size="small" fill="full" />
      <Dot variant="success" size="small" fill="full" />
      <Dot variant="info" size="small" fill="half" />
      <Dot variant="neutral" size="small" fill="empty" />
      <Text text="Verification of 4 · SYM-431" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Dot variant="success" size="small" fill="full" />
      <Dot variant="danger" size="small" fill="full" />
      <Dot variant="neutral" size="small" fill="empty" />
      <Dot variant="neutral" size="small" fill="empty" />
      <Text text="Implementation failed · SYM-471" wrap />
    </Stack>
  </Stack>
);
