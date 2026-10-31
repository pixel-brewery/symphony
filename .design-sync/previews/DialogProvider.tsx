import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  DialogProvider,
  Hint,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceDangerZone = () => (
  <DialogProvider>
    <Card>
      <CardHeader
        text="Managed workspaces"
        subText="Worktrees Symphony created for executions on this Mac."
      />
      <CardContent>
        <Stack orientation="vertical" gap="small">
          <Text text="WS-7 · symphony-main · codex/fix-ci-case-paths" wrap />
          <Text text="2.4 GB allocated · last execution 6 minutes ago" variant="neutral" wrap />
          <Hint
            text="Deleting a workspace asks for confirmation in a dialog opened from this provider."
            textOverflow="wrap"
          />
        </Stack>
      </CardContent>
      <CardFooter>
        <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
          <Button label="Reclaim artifacts" appearance="plain" />
          <Button label="Delete workspace" appearance="solid" variant="danger" />
        </Stack>
      </CardFooter>
    </Card>
  </DialogProvider>
);

export const BoardActionsHost = () => (
  <DialogProvider>
    <Stack orientation="vertical" gap="small">
      <Text text="Three tickets selected on the board" wrap />
      <Text
        text="Each action below opens its own dialog — grouping mode, agent selection, and the delivery confirmation."
        variant="neutral"
        wrap
      />
      <Stack orientation="horizontal" gap="small" wrap>
        <Button label="Group tickets" icon="clipboardTask" appearance="soft" />
        <Button label="Choose agent" icon="bot" appearance="soft" />
        <Button label="Deliver" icon="cloudArrowRight" appearance="solid" variant="primary" />
      </Stack>
    </Stack>
  </DialogProvider>
);
