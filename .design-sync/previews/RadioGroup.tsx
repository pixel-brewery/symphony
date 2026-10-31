import { Hint, Radio, RadioGroup, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const DeliveryGroupMode = () => (
  <Stack orientation="vertical" gap="small">
    <Text
      text="Direct grouping is intended for an explicit operator decision. It skips the AI assessment but keeps repository, revision, claim, and overlap boundaries."
      wrap
    />
    <RadioGroup name="delivery-group-mode" orientation="vertical" value="direct">
      <Radio value="direct" label="Copy directly without AI analysis" />
      <Radio value="analyzer" label="Analyze relationship with AI first" />
    </RadioGroup>
  </Stack>
);

export const Orientations = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="tiny">
      <Text text="Vertical — the delivery dialogs stack their options" variant="neutral" wrap />
      <RadioGroup name="run-scope-vertical" orientation="vertical" value="item">
        <Radio value="item" label="Run the selected work item only" />
        <Radio value="column" label="Run every Ready item in the column" />
        <Radio value="board" label="Run the whole board" />
      </RadioGroup>
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text
        text="Horizontal — short, mutually exclusive choices in a toolbar row"
        variant="neutral"
        wrap
      />
      <RadioGroup name="agent-horizontal" orientation="horizontal" value="claude">
        <Radio value="claude" label="Claude" />
        <Radio value="codex" label="Codex" />
      </RadioGroup>
    </Stack>
  </Stack>
);

export const Disabled = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="No AI account is connected, so the whole group is switched off." wrap />
    <RadioGroup name="agent-disabled" orientation="vertical" value="claude" disabled>
      <Radio value="claude" label="Claude — the repository default" />
      <Radio value="codex" label="Codex" />
    </RadioGroup>
    <Hint text="Connect an account under Settings before choosing an agent." textOverflow="wrap" />
  </Stack>
);

export const Invalid = () => (
  <Stack orientation="vertical" gap="small">
    <Text
      text="A target branch strategy has to be chosen before the pull request can be updated."
      wrap
    />
    <RadioGroup name="branch-strategy" orientation="vertical" invalid required>
      <Radio invalid value="rebase" label="Rebase the delivery branch onto main" />
      <Radio invalid value="merge" label="Merge main into the delivery branch" />
    </RadioGroup>
    <Hint
      text="Symphony needs a strategy before it can update the pull request."
      textOverflow="wrap"
    />
  </Stack>
);
