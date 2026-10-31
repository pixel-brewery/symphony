import { Code, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const BranchReference = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
    <Text text="Delivery branch" />
    <Code text="codex/fix-ci-case-paths" />
    <Text text="targets" />
    <Code text="main" />
  </Stack>
);

export const CommandsAndPaths = () => (
  <Stack orientation="vertical" gap="small">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
      <Text text="Run" />
      <Code text="yarn agents:check" />
      <Text text="before handoff." />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
      <Text text="Skills live under" />
      <Code text=".agents/skills/" />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
      <Text text="This workflow supports" />
      <Code text="workflow_dispatch" />
    </Stack>
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const).map(
      (variant) => (
        <Stack key={variant} orientation="horizontal" gap="small" verticalAlignment="center">
          <Text text={variant} variant="neutral" />
          <Code variant={variant} text="ENOSPC: no space left on device" />
        </Stack>
      ),
    )}
  </Stack>
);
