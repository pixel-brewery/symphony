import {
  Stack,
  Text,
  Timeline,
  TimelineContent,
  TimelineItem,
  TimelineMarker,
} from '@pixel-brewery/mosaik-elements-react';

const auditTrail = [
  {
    id: 'pulled',
    icon: 'board',
    variant: 'neutral' as const,
    detail: 'Work item pulled from the GitHub Project board',
    meta: 'Symphony · 09:12',
  },
  {
    id: 'resolved',
    icon: 'skills',
    variant: 'info' as const,
    detail: 'Analysis skill resolved for pixel-brewery/symphony',
    meta: 'Claude · 09:13',
  },
  {
    id: 'worktree',
    icon: 'branch',
    variant: 'primary' as const,
    detail: 'Worktree created on codex/fix-ci-case-paths',
    meta: 'Symphony · 09:14',
  },
  {
    id: 'delivered',
    icon: 'checkCircle',
    variant: 'success' as const,
    detail: 'Pull request #482 opened and linked to the ticket',
    meta: 'Claude · 09:41',
  },
];

export const WorkflowAuditTrail = () => (
  <Timeline orientation="vertical" align="start">
    {auditTrail.map((entry) => (
      <TimelineItem key={entry.id}>
        <TimelineMarker icon={entry.icon} variant={entry.variant} appearance="soft" size="medium" />
        <TimelineContent>
          <Stack orientation="vertical" gap="tiny">
            <Text text={entry.detail} wrap />
            <Text text={entry.meta} variant="neutral" wrap />
          </Stack>
        </TimelineContent>
      </TimelineItem>
    ))}
  </Timeline>
);

export const AlignEnd = () => (
  <Timeline orientation="vertical" align="end">
    {auditTrail.slice(0, 3).map((entry) => (
      <TimelineItem key={entry.id}>
        <TimelineMarker icon={entry.icon} variant={entry.variant} appearance="soft" size="medium" />
        <TimelineContent>
          <Text text={entry.detail} wrap />
        </TimelineContent>
      </TimelineItem>
    ))}
  </Timeline>
);

export const HorizontalDeliveryStages = () => (
  <Timeline orientation="horizontal" align="start">
    <TimelineItem>
      <TimelineMarker icon="clipboardTask" variant="success" appearance="soft" size="small" />
      <TimelineContent>
        <Text text="Qualified" wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker icon="bot" variant="success" appearance="soft" size="small" />
      <TimelineContent>
        <Text text="Analysed" wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker icon="branch" variant="primary" appearance="soft" size="small" />
      <TimelineContent>
        <Text text="Delivering" wrap />
      </TimelineContent>
    </TimelineItem>
    <TimelineItem>
      <TimelineMarker icon="github" variant="neutral" appearance="soft" size="small" />
      <TimelineContent>
        <Text text="In review" wrap />
      </TimelineContent>
    </TimelineItem>
  </Timeline>
);
