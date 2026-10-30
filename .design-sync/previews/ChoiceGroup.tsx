import { Choice, ChoiceGroup, Hint, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const HorizontalAccountPicker = () => (
  <Stack orientation="vertical" gap="small">
    <ChoiceGroup
      name="ai-account"
      orientation="horizontal"
      appearance="outline"
      variant="primary"
      value="claude-primary"
    >
      <Text slot="header" text="AI account" wrap />
      <Choice
        value="claude-primary"
        appearance="outline"
        variant="primary"
        icon="claude"
        label="Claude · primary"
        additional="Signed in as contributor@example.invalid"
      />
      <Choice
        value="codex-backup"
        appearance="outline"
        variant="primary"
        icon="openai"
        label="Codex · backup"
        additional="Out of quota until 14:20"
      />
    </ChoiceGroup>
    <Hint
      text="Accounts are connected once under Connected services and shared by every agent of this workspace."
      textOverflow="wrap"
    />
  </Stack>
);

export const VerticalOrientation = () => (
  <ChoiceGroup
    name="delivery-policy"
    orientation="vertical"
    appearance="outline"
    variant="primary"
    value="managed-branch"
  >
    <Text slot="header" text="Agentic delivery policy" wrap />
    <Choice
      value="managed-branch"
      appearance="outline"
      variant="primary"
      label="Managed branch"
      additional="The agent pushes to a Symphony-owned branch and opens the pull request."
    />
    <Choice
      value="local-only"
      appearance="outline"
      variant="primary"
      label="Local only"
      additional="Changes stay in the managed worktree. Nothing is pushed."
    />
    <Choice
      value="direct-main"
      appearance="outline"
      variant="primary"
      label="Direct to main"
      additional="Not permitted while branch protection is active."
      disabled
    />
  </ChoiceGroup>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="large">
    {(['primary', 'info', 'success', 'warning'] as const).map((variant) => (
      <ChoiceGroup
        key={variant}
        name={`trigger-${variant}`}
        orientation="horizontal"
        appearance="outline"
        variant={variant}
        value="on-qualified"
      >
        <Text slot="header" text={variant} variant="neutral" wrap />
        <Choice
          value="on-qualified"
          appearance="outline"
          variant={variant}
          label="When qualified"
        />
        <Choice value="on-assign" appearance="outline" variant={variant} label="On sole assignee" />
        <Choice value="manual" appearance="outline" variant={variant} label="Manual only" />
      </ChoiceGroup>
    ))}
  </Stack>
);

export const DisabledGroup = () => (
  <Stack orientation="vertical" gap="large">
    <ChoiceGroup
      name="runner-enabled"
      orientation="horizontal"
      appearance="outline"
      variant="primary"
      value="ubuntu-24"
    >
      <Text slot="header" text="Runner image" wrap />
      <Choice value="ubuntu-24" appearance="outline" variant="primary" label="ubuntu-24.04" />
      <Choice value="ubuntu-22" appearance="outline" variant="primary" label="ubuntu-22.04" />
    </ChoiceGroup>
    <ChoiceGroup
      name="runner-disabled"
      orientation="horizontal"
      appearance="outline"
      variant="primary"
      value="ubuntu-24"
      disabled
    >
      <Text slot="header" text="Runner image · locked by the repository binding" wrap />
      <Choice
        value="ubuntu-24"
        appearance="outline"
        variant="primary"
        label="ubuntu-24.04"
        disabled
      />
      <Choice
        value="ubuntu-22"
        appearance="outline"
        variant="primary"
        label="ubuntu-22.04"
        disabled
      />
    </ChoiceGroup>
  </Stack>
);

export const InvalidWithError = () => (
  <ChoiceGroup
    name="workspace-binding"
    orientation="horizontal"
    appearance="outline"
    variant="danger"
    invalid
    required
  >
    <Text slot="header" text="Repository binding" wrap />
    <Choice value="symphony" appearance="outline" variant="danger" label="pixel-brewery/symphony" />
    <Choice value="mosaik" appearance="outline" variant="danger" label="RueDeRennes/mosaik" />
    <Text
      slot="error"
      text="Pick a repository before the workspace can run a delivery."
      variant="danger"
      wrap
    />
  </ChoiceGroup>
);
