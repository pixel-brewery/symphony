import { Select, SelectItem, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const AgentOptions = () => (
  <Select
    label="Delivery agent"
    value="claude"
    isDropDownOpen
    dropDownStaysOpen
    dropDownStrategy="absolute"
  >
    <SelectItem label="Claude Opus 5" value="claude" icon="claude" isSelected />
    <SelectItem label="Codex" value="codex" icon="openai" />
    <SelectItem label="GitHub Copilot" value="copilot" icon="github" disabled />
  </Select>
);

export const ItemStates = () => (
  <Select
    label="Resource preset"
    value="balanced"
    isDropDownOpen
    dropDownStaysOpen
    dropDownStrategy="absolute"
  >
    <SelectItem label="compact" value="compact" />
    <SelectItem label="balanced" value="balanced" isSelected />
    <SelectItem label="performance" value="performance" isActive />
    <SelectItem label="custom" value="custom" disabled />
  </Select>
);

export const ItemsWithMetadata = () => (
  <Select
    label="Skill"
    value="solve-change-request"
    isDropDownOpen
    dropDownStaysOpen
    dropDownStrategy="absolute"
  >
    <SelectItem label="analyze-change-request" value="analyze-change-request" icon="skills">
      <Text slot="end" text="repo" variant="neutral" />
    </SelectItem>
    <SelectItem label="solve-change-request" value="solve-change-request" icon="skills" isSelected>
      <Text slot="end" text="repo" variant="neutral" />
    </SelectItem>
    <SelectItem label="diagnose-ci-failure" value="diagnose-ci-failure" icon="skills">
      <Text slot="end" text="portable" variant="neutral" />
    </SelectItem>
  </Select>
);

export const ClosedSelectionSurface = () => (
  <Stack orientation="vertical" gap="medium">
    <Select label="Delivery agent" value="claude">
      <SelectItem label="Claude Opus 5" value="claude" icon="claude" isSelected />
      <SelectItem label="Codex" value="codex" icon="openai" />
    </Select>
    <Select label="Delivery agent" value="codex">
      <SelectItem label="Claude Opus 5" value="claude" icon="claude" />
      <SelectItem label="Codex" value="codex" icon="openai" isSelected />
    </Select>
  </Stack>
);
