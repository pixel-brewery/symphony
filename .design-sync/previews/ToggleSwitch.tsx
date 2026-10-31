import { Hint, Stack, Text, ToggleSwitch } from '@pixel-brewery/mosaik-elements-react';

export const AutomationSettings = () => (
  <Stack orientation="vertical" gap="medium">
    <ToggleSwitch variant="primary" isChecked>
      <Stack slot="label" orientation="vertical" gap="tiny">
        <Text text="Run autonomous work" wrap />
        <Hint
          text="Analyze backlog items, implement Ready items, retry failed work, and synchronize pull-request status."
          textOverflow="wrap"
        />
      </Stack>
    </ToggleSwitch>
    <ToggleSwitch variant="primary">
      <Stack slot="label" orientation="vertical" gap="tiny">
        <Text text="Allow GitHub commands" wrap />
        <Hint
          text="Run authorized @symphony comments and deliver successful implementation branches and pull requests."
          textOverflow="wrap"
        />
      </Stack>
    </ToggleSwitch>
    <ToggleSwitch variant="primary" isChecked>
      <Stack slot="label" orientation="vertical" gap="tiny">
        <Text text="Retain failed execution workspaces" wrap />
        <Hint
          text="Keep failed worktrees for diagnosis instead of removing them after completion."
          textOverflow="wrap"
        />
      </Stack>
    </ToggleSwitch>
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="small">
    <ToggleSwitch
      variant="primary"
      label="Off — agentic delivery is switched off"
      isChecked={false}
    />
    <ToggleSwitch
      variant="primary"
      label="On — repair failing checks on Symphony pull requests"
      isChecked
    />
    <ToggleSwitch variant="primary" label="Disabled — no GitHub account is connected" disabled />
    <ToggleSwitch
      variant="primary"
      label="Disabled and on — enforced by the repository binding"
      disabled
      isChecked
    />
    <ToggleSwitch variant="primary" label="Invalid — a delivery policy has to be chosen" invalid />
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'primary', 'success', 'warning', 'danger', 'info'] as const).map((variant) => (
      <ToggleSwitch
        key={variant}
        variant={variant}
        isChecked
        label={`${variant} — notify when an execution finishes`}
      />
    ))}
  </Stack>
);

export const LabelPosition = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Label after the switch (default)" variant="neutral" wrap />
    <ToggleSwitch
      variant="primary"
      isChecked
      labelPosition="after"
      label="Rerun CI after every repair attempt"
    />
    <Text
      text="Label before the switch — used in Symphony's settings rows"
      variant="neutral"
      wrap
    />
    <ToggleSwitch
      variant="primary"
      isChecked
      labelPosition="before"
      label="Rerun CI after every repair attempt"
    />
  </Stack>
);
