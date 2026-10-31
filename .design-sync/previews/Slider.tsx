import { Slider, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const CustomResources = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="small">
      <Text text="CPUs — 4 of 10" />
      <Slider min={2} max={10} step={1} value={4} variant="primary" appearance="solid" />
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="Memory — 16 GiB of 64" />
      <Slider min={8} max={64} step={1} value={16} variant="primary" appearance="solid" />
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="Disk — 80 GiB of 240" />
      <Slider min={8} max={240} step={8} value={80} variant="primary" appearance="solid" />
    </Stack>
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'primary', 'success', 'warning', 'danger', 'info'] as const).map((variant) => (
      <Stack key={variant} orientation="vertical" gap="small">
        <Text text={variant} variant="neutral" />
        <Slider variant={variant} appearance="solid" min={0} max={100} value={60} />
      </Stack>
    ))}
  </Stack>
);

export const WithTicks = () => (
  <Stack orientation="vertical" gap="medium">
    <Text text="Concurrent executions" />
    <Slider
      min={1}
      max={8}
      step={1}
      value={3}
      ticks={1}
      tickPlacement="after"
      showTickLabels
      variant="primary"
      appearance="solid"
    />
  </Stack>
);

export const BoundsAndDisabled = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="small">
      <Text text="CPUs allocated to a local CI run" />
      <Slider min={2} max={10} step={1} value={4} variant="primary" appearance="solid">
        <Text slot="prefix" text="2" variant="neutral" />
        <Text slot="suffix" text="10" variant="neutral" />
      </Slider>
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="Disabled while a local CI run is in flight" variant="neutral" />
      <Slider min={2} max={10} step={1} value={4} disabled variant="primary" appearance="solid" />
    </Stack>
  </Stack>
);
