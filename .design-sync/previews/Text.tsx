import { Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Delivery completed successfully" variant="success" wrap />
    <Text text="Two checks are still running" variant="info" wrap />
    <Text text="Workspace is close to its write limit" variant="warning" wrap />
    <Text text="Analysis failed — see the execution log" variant="danger" wrap />
    <Text text="Last synchronised 4 minutes ago" variant="neutral" wrap />
  </Stack>
);

export const Wrapping = () => (
  <Stack orientation="vertical" gap="medium" fit="width">
    <Text
      text="Keep failed worktrees for diagnosis instead of removing them after completion. Symphony reclaims the space once the workspace is closed."
      wrap
    />
    <Text
      text="This single line is truncated instead of wrapping, which is how table cells and list rows keep their height predictable."
      truncate
    />
  </Stack>
);

export const Alignment = () => (
  <Stack orientation="vertical" gap="small" fit="width">
    <Text text="Left aligned" alignment="left" wrap />
    <Text text="Centre aligned" alignment="center" wrap />
    <Text text="Right aligned" alignment="right" wrap />
  </Stack>
);
