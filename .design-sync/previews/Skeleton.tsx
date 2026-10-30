import { Skeleton, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

// A skeleton earns its place by matching the shape of the content it replaces.
export const DeliveryDetailLoading = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Reading the per-workspace execution database" variant="neutral" wrap />
    <Skeleton width="320px" height="22px" shimmer />
    <Skeleton width="200px" height="14px" shimmer />
    <Skeleton width="520px" height="14px" shimmer />
    <Skeleton width="430px" height="14px" shimmer />
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Skeleton width="88px" height="26px" shimmer />
      <Skeleton width="120px" height="26px" shimmer />
    </Stack>
  </Stack>
);

export const WorkspaceListLoading = () => (
  <Stack orientation="vertical" gap="medium">
    {[0, 1, 2, 3].map((index) => (
      <Stack key={index} orientation="horizontal" gap="small" verticalAlignment="center">
        <Skeleton shape="circle" width="32px" height="32px" shimmer />
        <Stack orientation="vertical" gap="tiny" fit="width">
          <Skeleton width="220px" height="14px" shimmer />
          <Skeleton width="320px" height="12px" shimmer />
        </Stack>
      </Stack>
    ))}
  </Stack>
);

export const ExecutionTableLoading = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Executions · last 24 hours" variant="neutral" wrap />
    {[0, 1, 2, 3, 4].map((index) => (
      <Stack key={index} orientation="horizontal" gap="medium" verticalAlignment="center">
        <Skeleton width="160px" height="14px" shimmer />
        <Skeleton width="220px" height="14px" shimmer />
        <Skeleton width="90px" height="14px" shimmer />
        <Skeleton width="70px" height="14px" shimmer />
      </Stack>
    ))}
  </Stack>
);

export const ShapesAndShimmer = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
      <Skeleton shape="circle" width="48px" height="48px" shimmer />
      <Skeleton shape="rect" width="260px" height="48px" shimmer />
      <Text text="shimmer" variant="neutral" />
    </Stack>
    <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
      <Skeleton shape="circle" width="48px" height="48px" />
      <Skeleton shape="rect" width="260px" height="48px" />
      <Text text="static" variant="neutral" />
    </Stack>
  </Stack>
);
