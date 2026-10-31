import { Segment, SegmentItem, Stack } from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceSettingsSections = () => (
  <Segment appearance="soft">
    <SegmentItem label="AI team" isChecked />
    <SegmentItem label="Connected services" />
    <SegmentItem label="Repositories" />
    <SegmentItem label="Administration" />
  </Segment>
);

export const SkillEditorTabs = () => (
  <Segment appearance="soft" variant="primary">
    <SegmentItem label="Built-in instructions" isChecked variant="primary" />
    <SegmentItem label="Your additions" variant="primary" />
  </Segment>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'soft', 'outline', 'solid'] as const).map((appearance) => (
      <Segment key={appearance} appearance={appearance}>
        <SegmentItem label="Board" isChecked appearance={appearance} />
        <SegmentItem label="Deliveries" appearance={appearance} />
        <SegmentItem label="Executions" appearance={appearance} />
      </Segment>
    ))}
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['primary', 'success', 'warning', 'neutral'] as const).map((variant) => (
      <Segment key={variant} appearance="soft" variant={variant}>
        <SegmentItem label="Queued" isChecked variant={variant} />
        <SegmentItem label="Running" variant={variant} />
        <SegmentItem label="Done" variant={variant} />
      </Segment>
    ))}
  </Stack>
);

export const Disabled = () => (
  <Segment appearance="soft" disabled>
    <SegmentItem label="Shipped skills" isChecked disabled />
    <SegmentItem label="Your additions" disabled />
  </Segment>
);
