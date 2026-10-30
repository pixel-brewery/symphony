import { Button, Stack, TabStrip, TabStripItem } from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceSections = () => (
  <TabStrip hasIndicator>
    <TabStripItem label="Board" icon="board" isSelected />
    <TabStripItem label="Deliveries" icon="branch" />
    <TabStripItem label="Executions" icon="executionOutline" />
    <TabStripItem label="Skills" icon="skills" />
  </TabStrip>
);

export const MobileBottomNavigation = () => (
  <TabStrip placement="bottom" hasIndicator={false}>
    <TabStripItem label="Home" icon="homeOutline" orientation="vertical" isSelected />
    <TabStripItem label="Tickets" icon="clipboardTask" orientation="vertical" />
    <TabStripItem label="Merges" icon="branch" orientation="vertical" />
    <TabStripItem label="Settings" icon="settings" orientation="vertical" />
  </TabStrip>
);

export const WithEndAction = () => (
  <TabStrip hasIndicator variant="primary">
    <TabStripItem label="Open" isSelected variant="primary" />
    <TabStripItem label="Merged" variant="primary" />
    <TabStripItem label="Closed" variant="primary" />
    <Button slot="end" icon="filter" appearance="plain" variant="neutral" />
  </TabStrip>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['primary', 'success', 'warning', 'neutral'] as const).map((variant) => (
      <TabStrip key={variant} variant={variant} hasIndicator>
        <TabStripItem label="Analysis" variant={variant} isSelected />
        <TabStripItem label="Implementation" variant={variant} />
        <TabStripItem label="Review" variant={variant} />
      </TabStrip>
    ))}
  </Stack>
);

export const DisabledStrip = () => (
  <TabStrip hasIndicator disabled>
    <TabStripItem label="Board" icon="board" isSelected disabled />
    <TabStripItem label="Deliveries" icon="branch" disabled />
    <TabStripItem label="Executions" icon="executionOutline" disabled />
  </TabStrip>
);
