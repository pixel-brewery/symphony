import { Box, Hint, Radio, RadioGroup, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const AgentSelection = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Which AI account should run this work item?" wrap />
    <RadioGroup name="execution-agent" orientation="vertical" value="claude">
      <Radio value="claude" label="Claude — the repository default" />
      <Radio value="codex" label="Codex — currently out of quota until 18:00" />
    </RadioGroup>
    <Hint
      text="The account is recorded on the execution and cannot be changed after the run starts."
      textOverflow="wrap"
    />
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="small">
    <Radio label="Unchecked — keep the existing pull request" isChecked={false} />
    <Radio label="Checked — open a new pull request for this claim" isChecked />
    <Radio label="Disabled — the GitHub account is not connected" disabled />
    <Radio label="Disabled and checked — enforced by the repository binding" disabled isChecked />
    <Radio label="Invalid — a delivery target has to be chosen" invalid />
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'primary', 'success', 'warning', 'info', 'neutral'] as const).map((variant) => (
      <Radio
        key={variant}
        variant={variant}
        appearance="soft"
        isChecked
        label={`${variant} — deliver to the implementation branch`}
      />
    ))}
  </Stack>
);

export const LabelPosition = () => (
  <Stack orientation="vertical" gap="small">
    <Text
      text="labelPosition=after (default) — control first, label reads left to right"
      variant="neutral"
      wrap
    />
    <Box inset="all" cornered highlighted>
      <Radio
        appearance="soft"
        variant="primary"
        labelPosition="after"
        isChecked
        label="Analyze the relationship with AI first"
      />
    </Box>
    <Text
      text="labelPosition=before — label first, control parked at the end of the row"
      variant="neutral"
      wrap
    />
    <Box inset="all" cornered highlighted>
      <Radio
        appearance="soft"
        variant="primary"
        labelPosition="before"
        isChecked
        label="Analyze the relationship with AI first"
      />
    </Box>
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'soft', 'outline', 'plain'] as const).map((appearance) => (
      <Radio
        key={appearance}
        appearance={appearance}
        variant="primary"
        isChecked
        label={`${appearance} — run verification before delivery`}
      />
    ))}
  </Stack>
);
