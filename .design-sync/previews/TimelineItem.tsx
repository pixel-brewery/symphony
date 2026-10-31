import {
  Code,
  Stack,
  Text,
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelineMarker,
} from '@pixel-brewery/mosaik-elements-react';

export const ExecutionEvent = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker icon="play" variant="primary" appearance="soft" size="medium" />
      <TimelineContent>
        <Stack orientation="vertical" gap="tiny">
          <Text text="Execution started for skill solve-change-request" wrap />
          <Text text="Workspace flamox365 · Claude Opus · 11:04" variant="neutral" wrap />
        </Stack>
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);

export const DefaultMarker = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineContent>
        <Text text="Item without a slotted marker falls back to the built-in pip." wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineContent>
        <Text text="Useful for plain change logs where every entry weighs the same." wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineContent>
        <Text text="Symphony uses this shape for the skill revision history." wrap />
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);

export const StepSequence = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker icon="checkmark" variant="success" appearance="soft" size="medium" />
      <TimelineContent>
        <Stack orientation="vertical" gap="tiny">
          <Text text="Set up job" wrap />
          <Text text="Succeeded in 4s" variant="neutral" wrap />
        </Stack>
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker variant="primary" appearance="soft" size="medium" isBusy />
      <TimelineContent>
        <Stack orientation="vertical" gap="tiny">
          <Text text="Run yarn nx run-many --target=test" wrap />
          <Text text="Running for 2m 18s" variant="neutral" wrap />
        </Stack>
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker icon="error" variant="danger" appearance="soft" size="medium" />
      <TimelineContent>
        <Stack orientation="vertical" gap="tiny">
          <Text text="Lint renderer" wrap />
          <Code text="apps/renderer/src/app/App.ts:12 unused import" variant="danger" />
        </Stack>
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);
