import { FormField, Select, SelectItem, Stack } from '@pixel-brewery/mosaik-elements-react';

export const ResourcePreset = () => (
  <Select label="Resource preset" value="balanced">
    <SelectItem label="compact · 2 CPUs · 8 GB" value="compact" />
    <SelectItem label="balanced · 4 CPUs · 16 GB" value="balanced" isSelected />
    <SelectItem label="performance · 8 CPUs · 32 GB" value="performance" />
    <SelectItem label="custom" value="custom" />
  </Select>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'outline', 'soft', 'solid', 'plain'] as const).map((appearance) => (
      <Select key={appearance} appearance={appearance} label="Delivery agent" value="claude">
        <SelectItem label="Claude Opus 5" value="claude" isSelected />
        <SelectItem label="Codex" value="codex" />
      </Select>
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Select label="Target branch" placeholder="Pick a branch" />
    <Select label="Target branch" value="main" isClearable>
      <SelectItem label="main" value="main" isSelected />
      <SelectItem label="codex/fix-ci-case-paths" value="fix-ci" />
    </Select>
    <Select label="Target branch" value="main" disabled>
      <SelectItem label="main" value="main" isSelected />
    </Select>
    <Select label="Target branch" value="main" isReadOnly>
      <SelectItem label="main" value="main" isSelected />
    </Select>
  </Stack>
);

export const RequiredWithError = () => (
  <FormField
    label="Workspace image"
    hint="The base image every execution for this workspace runs in."
    error="Pick an image before starting a delivery."
  >
    <Select placeholder="No image selected" required>
      <SelectItem label="macos-15-arm64" value="macos-15-arm64" />
      <SelectItem label="ubuntu-24.04" value="ubuntu-24.04" />
    </Select>
  </FormField>
);
