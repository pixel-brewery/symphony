import {
  Card,
  CardContent,
  CardHeader,
  Dismiss,
  Divider,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const InPanelHeader = () => (
  <Stack orientation="vertical" gap="small">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center" fit="width">
      <Stack orientation="vertical" fit="width">
        <Text text="Add repository" wrap />
      </Stack>
      <Dismiss size="small" />
    </Stack>
    <Divider />
    <Text text="GitHub source control and Actions" variant="neutral" wrap />
  </Stack>
);

export const InCardHeader = () => (
  <Card>
    <CardHeader text="Delivery failed" subText="SYM-418 · implementation role">
      <Dismiss slot="suffix" variant="danger" />
    </CardHeader>
    <CardContent text="The managed worktree exceeded the unix socket path limit." />
  </Card>
);

export const Sizes = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
    {(['tiny', 'small', 'medium', 'large', 'giant'] as const).map((size) => (
      <Dismiss key={size} size={size} />
    ))}
  </Stack>
);

export const VariantsAndDisabled = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
    <Dismiss variant="neutral" />
    <Dismiss variant="primary" />
    <Dismiss variant="warning" />
    <Dismiss variant="success" />
    <Dismiss disabled />
  </Stack>
);
