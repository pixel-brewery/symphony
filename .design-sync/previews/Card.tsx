import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const SettingsCard = () => (
  <Card>
    <CardHeader
      text="Storage safety"
      subText="Physical allocation, hard write limits, and the Mac free-space reserve."
    />
    <CardContent>
      <Stack orientation="vertical" gap="small">
        <Text text="All managed Symphony data" wrap />
        <Text text="18.4 GB across 6 workspaces · 2.1 GB reclaimable" variant="neutral" wrap />
      </Stack>
    </CardContent>
    <CardFooter>
      <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
        <Button label="Discard" variant="neutral" />
        <Button label="Save limits" variant="primary" appearance="solid" />
      </Stack>
    </CardFooter>
  </Card>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Card>
      <CardHeader text="Default" subText="Delivery workspace" />
      <CardContent text="Branch codex/fix-ci-case-paths is ready to review." />
    </Card>
    <Card isSelected>
      <CardHeader text="Selected" subText="Delivery workspace" />
      <CardContent text="Selection is how the board marks the item you are working on." />
    </Card>
    <Card appearance="soft">
      <CardHeader text="Soft" subText="Delivery workspace" />
      <CardContent text="A soft card recedes into the page instead of sitting on it." />
    </Card>
  </Stack>
);

export const Elevations = () => (
  <Stack orientation="vertical" gap="medium">
    {(['none', 'regular', 'bold'] as const).map((elevation) => (
      <Card key={elevation} elevation={elevation}>
        <CardHeader text={`Elevation ${elevation}`} />
        <CardContent text="Raised surfaces separate a card from the page behind it." />
      </Card>
    ))}
  </Stack>
);
