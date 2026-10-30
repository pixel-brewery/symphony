import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Cell,
  MessageBoxProvider,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const ConfirmDestructiveAction = () => (
  <MessageBoxProvider>
    <Card>
      <CardHeader
        text="Delete workspace"
        subText="Removes the managed worktrees, executions, and cached clones."
      />
      <CardContent>
        <Text text="Deleting symphony frees 8.2 GB. Running deliveries are cancelled first." wrap />
      </CardContent>
      <CardFooter>
        <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
          <Button label="Cancel" variant="neutral" />
          <Button label="Delete workspace" variant="danger" appearance="solid" icon="delete" />
        </Stack>
      </CardFooter>
    </Card>
  </MessageBoxProvider>
);

export const ProviderAroundSettingsRows = () => (
  <MessageBoxProvider>
    <Stack orientation="vertical" gap="small">
      <Text
        text="Every row below can ask for confirmation through the message box context."
        variant="neutral"
        wrap
      />
      <Cell
        label="Disconnect GitHub"
        subLabel="RueDeRennes · asks before revoking the token"
        isNavigation
      />
      <Cell label="Reset skill catalog" subLabel="Re-imports every portable skill" isNavigation />
      <Cell label="Clear execution history" subLabel="2.1 GB reclaimable" isNavigation />
    </Stack>
  </MessageBoxProvider>
);
