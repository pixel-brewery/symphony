import { Segment, SegmentItem } from '@pixel-brewery/mosaik-elements-react';

export const CheckedAndUnchecked = () => (
  <Segment appearance="soft">
    <SegmentItem label="Open" isChecked />
    <SegmentItem label="Merged" />
    <SegmentItem label="Closed" />
  </Segment>
);

export const WithIcons = () => (
  <Segment appearance="soft" variant="primary">
    <SegmentItem label="Board" icon="board" isChecked variant="primary" />
    <SegmentItem label="Flow" icon="flow" variant="primary" />
    <SegmentItem label="Timeline" icon="executionOutline" variant="primary" />
  </Segment>
);

export const IconOnly = () => (
  <Segment appearance="soft">
    <SegmentItem icon="panelLeft" isChecked />
    <SegmentItem icon="panelRight" />
    <SegmentItem icon="panelLeftContract" />
  </Segment>
);

export const VerticalOrientation = () => (
  <Segment appearance="soft" variant="primary">
    <SegmentItem label="Board" icon="board" orientation="vertical" isChecked variant="primary" />
    <SegmentItem label="Deliveries" icon="branch" orientation="vertical" variant="primary" />
    <SegmentItem
      label="Executions"
      icon="executionOutline"
      orientation="vertical"
      variant="primary"
    />
  </Segment>
);
