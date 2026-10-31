import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Icon,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const TextProp = () => (
  <Card>
    <CardHeader text="Managed workspace" subText="symphony · delivery-418" />
    <CardContent text="Symphony clones the repository into a managed worktree, runs the agent there, and pushes a branch only when the skill is allowed to publish a pull request. Nothing is written back to your own checkout." />
  </Card>
);

export const ProjectedChildren = () => (
  <Card>
    <CardHeader text="Execution 4f21c9" subText="Claude Code · repository-audit" />
    <CardContent>
      <Stack orientation="vertical" gap="small">
        <Stack orientation="horizontal" gap="small" verticalAlignment="center">
          <Icon icon="branch" size="small" />
          <Text text="codex/fix-ci-case-paths" wrap />
        </Stack>
        <Stack orientation="horizontal" gap="small" verticalAlignment="center">
          <Icon icon="clipboardTask" size="small" />
          <Text text="4 files changed · 2 additions · 2 deletions" wrap />
        </Stack>
        <Divider />
        <Text text="Finished in 6 min 12 s · 118 k tokens" variant="neutral" wrap />
      </Stack>
    </CardContent>
  </Card>
);

export const ChildrenReplaceTheTextProp = () => (
  <Stack orientation="vertical" gap="medium">
    <Card>
      <CardHeader text="text prop" subText="Rendered through the content slot fallback" />
      <CardContent text="Two claims are running against the managed worktrees." />
    </Card>
    <Card>
      <CardHeader text="Children" subText="Fill the same slot and replace the fallback" />
      <CardContent text="This string is never shown.">
        <Text text="Two claims are running against the managed worktrees." wrap />
      </CardContent>
    </Card>
  </Stack>
);

export const SeveralContentBlocks = () => (
  <Card>
    <CardHeader text="Storage safety" subText="Physical allocation and the free-space reserve" />
    <CardContent text="All managed Symphony data" />
    <CardContent>
      <Stack orientation="vertical" gap="tiny">
        <Text text="18.4 GB across 6 workspaces" wrap />
        <Text text="2.1 GB reclaimable · 42 GB free on this Mac" variant="neutral" wrap />
      </Stack>
    </CardContent>
  </Card>
);
