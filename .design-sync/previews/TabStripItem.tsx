import { Stack, TabStrip, TabStripItem } from '@pixel-brewery/mosaik-elements-react';

export const SelectedAndDefault = () => (
  <TabStrip hasIndicator>
    <TabStripItem label="Pull requests" isSelected />
    <TabStripItem label="Checks" />
    <TabStripItem label="Conversation" />
  </TabStrip>
);

export const WithIcons = () => (
  <TabStrip hasIndicator>
    <TabStripItem label="GitHub" icon="github" isSelected />
    <TabStripItem label="Claude" icon="claude" />
    <TabStripItem label="Codex" icon="openai" />
  </TabStrip>
);

export const IconPositions = () => (
  <TabStrip hasIndicator>
    <TabStripItem label="Before" icon="sync" iconPosition="before" isSelected />
    <TabStripItem label="After" icon="open" iconPosition="after" />
  </TabStrip>
);

export const VerticalOrientation = () => (
  <TabStrip placement="bottom" hasIndicator={false}>
    <TabStripItem label="Home" icon="homeOutline" orientation="vertical" isSelected />
    <TabStripItem label="Board" icon="board" orientation="vertical" />
    <TabStripItem label="Settings" icon="settings" orientation="vertical" />
  </TabStrip>
);

export const Disabled = () => (
  <TabStrip hasIndicator>
    <TabStripItem label="Summary" isSelected />
    <TabStripItem label="Merge queue" disabled />
    <TabStripItem label="Deployments" disabled />
  </TabStrip>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['primary', 'success', 'warning'] as const).map((variant) => (
      <TabStrip key={variant} variant={variant} hasIndicator>
        <TabStripItem label="Qualified" variant={variant} isSelected />
        <TabStripItem label="Ready" variant={variant} />
        <TabStripItem label="Blocked" variant={variant} />
      </TabStrip>
    ))}
  </Stack>
);
