import { ProgressRing, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const RunningChecks = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center" wrap>
    <ProgressRing isIndeterminate radius={8} thickness={2} variant="neutral" />
    <Text text="build · running" variant="neutral" />
    <ProgressRing isIndeterminate radius={9} thickness={2} variant="primary" />
    <Text text="delivery · working" variant="neutral" />
  </Stack>
);

export const Determinate = () => (
  <Stack orientation="horizontal" gap="large" verticalAlignment="center" wrap>
    <ProgressRing value={25} radius={24} thickness={4} variant="primary" label="25%" />
    <ProgressRing value={60} radius={24} thickness={4} variant="info" label="60%" />
    <ProgressRing value={100} radius={24} thickness={4} variant="success" label="100%" />
  </Stack>
);

export const Variants = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center" wrap>
    {(['primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const).map((variant) => (
      <ProgressRing
        key={variant}
        value={70}
        radius={16}
        thickness={3}
        variant={variant}
        label={variant}
      />
    ))}
  </Stack>
);

export const SizesAndDisabled = () => (
  <Stack orientation="horizontal" gap="large" verticalAlignment="center" wrap>
    <ProgressRing value={65} radius={10} thickness={2} variant="primary" />
    <ProgressRing value={65} radius={20} thickness={4} variant="primary" />
    <ProgressRing value={65} radius={32} thickness={8} variant="primary" />
    <ProgressRing value={65} radius={20} thickness={4} variant="primary" disabled />
  </Stack>
);
