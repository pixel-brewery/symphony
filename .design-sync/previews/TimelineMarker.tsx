import {
  Text,
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelineMarker,
} from '@pixel-brewery/mosaik-elements-react';

const variants = [
  { variant: 'primary' as const, icon: 'play', label: 'primary — run started' },
  { variant: 'success' as const, icon: 'checkCircle', label: 'success — checks passed' },
  { variant: 'warning' as const, icon: 'warning', label: 'warning — quota nearly used' },
  { variant: 'danger' as const, icon: 'errorCircle', label: 'danger — delivery failed' },
  { variant: 'info' as const, icon: 'info', label: 'info — workflow version adopted' },
  { variant: 'neutral' as const, icon: 'board', label: 'neutral — moved to Ready' },
];

export const Variants = () => (
  <Timeline orientation="vertical" align="start">
    {variants.map((entry) => (
      <TimelineItem key={entry.variant}>
        <TimelineMarker icon={entry.icon} variant={entry.variant} appearance="soft" size="medium" />
        <TimelineContent>
          <Text text={entry.label} wrap />
        </TimelineContent>
      </TimelineItem>
    ))}
  </Timeline>
);

export const Appearances = () => (
  <Timeline orientation="vertical" align="start">
    {(['solid', 'soft', 'outline', 'plain'] as const).map((appearance) => (
      <TimelineItem key={appearance}>
        <TimelineMarker icon="branch" variant="primary" appearance={appearance} size="medium" />
        <TimelineContent>
          <Text text={`${appearance} marker on the delivery branch event`} wrap />
        </TimelineContent>
      </TimelineItem>
    ))}
  </Timeline>
);

export const Sizes = () => (
  <Timeline orientation="vertical" align="start">
    {(['tiny', 'small', 'medium', 'large', 'giant'] as const).map((size) => (
      <TimelineItem key={size}>
        <TimelineMarker icon="executionOutline" variant="neutral" appearance="soft" size={size} />
        <TimelineContent>
          <Text text={`${size} marker`} wrap />
        </TimelineContent>
      </TimelineItem>
    ))}
  </Timeline>
);

export const TextAndStates = () => (
  <Timeline orientation="vertical" align="start">
    <TimelineItem>
      <TimelineMarker text="1" variant="primary" appearance="solid" size="medium" />
      <TimelineContent>
        <Text text="Numbered marker — step one of the delivery workflow" wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker variant="primary" appearance="soft" size="medium" isBusy />
      <TimelineContent>
        <Text text="Busy marker — the execution is still streaming events" wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker
        icon="disconnect"
        variant="neutral"
        appearance="soft"
        size="medium"
        disabled
      />
      <TimelineContent>
        <Text text="Disabled marker — the step was skipped by the workflow" wrap />
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);
