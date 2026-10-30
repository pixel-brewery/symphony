import { Checkbox, Hint, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const DeliveryOptions = () => (
  <Stack orientation="vertical" gap="small">
    <Checkbox label="Create as draft" isChecked />
    <Checkbox label="Run CI before requesting review" isChecked />
    <Checkbox label="Delete the worktree after merge" />
    <Hint
      text="A draft pull request cannot be merged and does not request reviews yet."
      textOverflow="wrap"
    />
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="small">
    <Checkbox label="Unchecked — skip the E2E workflow" isChecked={false} />
    <Checkbox label="Checked — push the branch after every commit" isChecked />
    <Checkbox
      label="Indeterminate — some workspaces enable auto-merge"
      isThreeState
      isChecked={null}
    />
    <Checkbox label="Disabled — Codex is out of quota" disabled />
    <Checkbox label="Disabled and checked — GitHub account is required" disabled isChecked />
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'primary', 'success', 'warning', 'danger', 'info'] as const).map((variant) => (
      <Checkbox
        key={variant}
        variant={variant}
        isChecked
        label={`${variant} — notify on execution finish`}
      />
    ))}
  </Stack>
);

export const LabelPosition = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Label after the box (default)" variant="neutral" wrap />
    <Checkbox label="Keep the delivery branch after merge" labelPosition="after" isChecked />
    <Text text="Label before the box" variant="neutral" wrap />
    <Checkbox label="Keep the delivery branch after merge" labelPosition="before" isChecked />
  </Stack>
);
