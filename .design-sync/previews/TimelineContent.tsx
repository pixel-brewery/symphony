import {
  Chip,
  Code,
  Stack,
  Text,
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelineMarker,
} from '@pixel-brewery/mosaik-elements-react';

export const PlainEntry = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker icon="comment" variant="neutral" appearance="soft" size="medium" />
      <TimelineContent>
        <Text
          text="Reviewer asked for the managed workspace path length fix to be covered by a regression test."
          wrap
        />
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);

export const StructuredEntry = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker icon="branch" variant="primary" appearance="soft" size="medium" />
      <TimelineContent>
        <Stack orientation="vertical" gap="small">
          <Text text="Delivery branch pushed" wrap />
          <Code text="codex/fix-ci-case-paths" />
          <Stack orientation="horizontal" gap="tiny" wrap>
            <Chip label="4 files" size="small" appearance="soft" variant="neutral" />
            <Chip label="+128 / -37" size="small" appearance="soft" variant="neutral" />
          </Stack>
        </Stack>
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);

export const FailureEntry = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker icon="error" variant="danger" appearance="soft" size="medium" />
      <TimelineContent>
        <Stack orientation="vertical" gap="small">
          <Text text="Analysis failed before the worktree was created" wrap />
          <Code text="ENAMETOOLONG: unix socket path exceeds 104 characters" variant="danger" />
          <Text text="Symphony · 09:14 · workspace flamox365" variant="neutral" wrap />
        </Stack>
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);
