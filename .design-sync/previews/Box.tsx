import { Box, Dismiss, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const WorkspacePanel = () => (
  <Box inset="all" cornered highlighted>
    <Stack orientation="vertical" gap="small">
      <Text text="WS-7 · symphony-main" />
      <Text
        text="Managed worktree on codex/fix-ci-case-paths · 2.4 GB allocated · last execution 6 minutes ago"
        variant="neutral"
        wrap
      />
    </Stack>
  </Box>
);

export const Insets = () => (
  <Stack orientation="vertical" gap="medium">
    <Box inset="all" highlighted cornered>
      <Text text="inset=all — a settings panel padded on every side" wrap />
    </Box>
    <Box inset="horizontal" highlighted cornered>
      <Text text="inset=horizontal — a board row that keeps its own vertical rhythm" wrap />
    </Box>
    <Box inset="vertical" highlighted cornered>
      <Text text="inset=vertical — a list section between two dividers" wrap />
    </Box>
    <Box inset="none" highlighted cornered>
      <Text text="inset=none — the container adds nothing of its own" wrap />
    </Box>
  </Stack>
);

export const Emphasis = () => (
  <Stack orientation="vertical" gap="medium">
    <Box inset="all">
      <Text text="Plain — groups the three execution rows below without drawing a surface." wrap />
    </Box>
    <Box inset="all" highlighted>
      <Text text="Highlighted — the selected workspace in the sidebar." wrap />
    </Box>
    <Box inset="all" highlighted cornered>
      <Text text="Highlighted and cornered — a rounded panel inside a settings card." wrap />
    </Box>
  </Stack>
);

export const FixedSize = () => (
  <Box width="360px" height="120px" inset="all" highlighted cornered>
    <Stack orientation="vertical" gap="small">
      <Text text="Pull request #482" />
      <Text text="fix(ci): normalise case-sensitive paths" variant="neutral" wrap />
      <Text text="2 checks running · 1 review requested" variant="info" wrap />
    </Stack>
  </Box>
);

export const DismissibleNotice = () => (
  <Box inset="all" highlighted cornered>
    <Dismiss slot="dismiss" size="small" appearance="plain" />
    <Stack orientation="vertical" gap="small">
      <Text text="Claude account reconnected" />
      <Text
        text="Queued deliveries resume automatically. Dismiss this once you have checked the run log."
        variant="neutral"
        wrap
      />
    </Stack>
  </Box>
);
