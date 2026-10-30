import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const DestructiveConfirmation = () => (
  <Card>
    <CardHeader text="Remove managed workspace" subText="symphony · delivery-418" />
    <CardContent text="The worktree, its SQLite execution history, and the cached runner image are deleted. The branch already pushed to GitHub is kept." />
    <CardFooter>
      <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
        <Button label="Keep workspace" appearance="plain" />
        <Button label="Remove" variant="danger" appearance="solid" />
      </Stack>
    </CardFooter>
  </Card>
);

export const MetadataAndAction = () => (
  <Card>
    <CardHeader text="repository-audit" subText="Portable skill · reads only" />
    <CardContent text="Walks the repository, checks the instruction files under .github, and reports drift without touching any source file." />
    <CardFooter>
      <Stack
        orientation="horizontal"
        gap="small"
        fit="width"
        verticalAlignment="center"
        horizontalAlignment="stretch"
      >
        <Text text="Last run 2 hours ago" variant="neutral" wrap />
        <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
          <Button label="Run now" icon="play" appearance="soft" variant="primary" />
        </Stack>
      </Stack>
    </CardFooter>
  </Card>
);

export const StatusFooter = () => (
  <Card>
    <CardHeader text="Delivery #418" subText="codex/fix-ci-case-paths → main" />
    <CardContent text="Claude Code renamed four case-only paths and re-ran the renderer specs." />
    <CardFooter>
      <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
        <Badge appearance="soft" variant="success" label="Checks passed" size="small" />
        <Badge appearance="soft" variant="neutral" label="1 review requested" size="small" />
        <Badge appearance="outline" label="Closes #402" size="small" />
      </Stack>
    </CardFooter>
  </Card>
);

export const StackedActions = () => (
  <Card>
    <CardHeader text="Pair a mobile device" subText="Studio iPad · verification code 418-902" />
    <CardContent text="Approve the device to let it read the board and comment on work items. It never gets repository or account credentials." />
    <CardFooter>
      <Stack orientation="vertical" gap="small" fit="width" horizontalAlignment="stretch">
        <Button label="Approve device" variant="primary" appearance="solid" />
        <Button label="Reject request" appearance="plain" variant="danger" />
      </Stack>
    </CardFooter>
  </Card>
);
