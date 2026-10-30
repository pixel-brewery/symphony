import { Hint, ProgressBar, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const DeliveryProgress = () => (
  <ProgressBar label="Included Actions minutes" min={0} max={100} value={74} variant="highlight">
    <Hint slot="hint" text="1 480 of 2 000 minutes used · resets on 1 October" />
  </ProgressBar>
);

export const Indeterminate = () => (
  <Stack orientation="vertical" gap="small">
    <ProgressBar label="Analysing work item" isIndeterminate variant="highlight" />
    <Text text="Creating and classifying the issue draft…" variant="neutral" wrap />
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['primary', 'success', 'warning', 'danger', 'neutral'] as const).map((variant) => (
      <ProgressBar key={variant} label={variant} min={0} max={100} value={58} variant={variant} />
    ))}
  </Stack>
);

export const Segmented = () => (
  <Stack orientation="vertical" gap="medium">
    <ProgressBar label="Delivery stages" min={0} max={4} value={3} segments={4} variant="success" />
    <ProgressBar
      label="Checks completed"
      min={0}
      max={6}
      value={2}
      segments={6}
      variant="warning"
    />
  </Stack>
);

export const Thickness = () => (
  <Stack orientation="vertical" gap="medium">
    <ProgressBar label="Thin" min={0} max={100} value={42} thickness={4} variant="neutral" />
    <ProgressBar label="Regular" min={0} max={100} value={42} thickness={8} variant="neutral" />
    <ProgressBar label="Bold" min={0} max={100} value={42} thickness={14} variant="neutral" />
  </Stack>
);
