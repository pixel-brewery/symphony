import { Chip, Hint, PromptBox, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

const draft = [
  'CI fails on the Linux runner because four renderer files differ only in case from their imports.',
  '',
  'Expected: yarn nx run renderer:build succeeds on ubuntu-latest.',
  'Constraint: the rename must be recorded by git, not just on disk.',
].join('\n');

export const WorkItemDraft = () => (
  <PromptBox
    label="Describe the issue"
    value={draft}
    minRows={6}
    maxRows={14}
    minlength={10}
    maxlength={50000}
    required
    showSubmitButton={false}
    submitOnEnter={false}
    appearance="outline"
    variant="highlight"
  />
);

export const WithReferenceContent = () => (
  <PromptBox
    label="Analysis focus (optional)"
    value="Check whether the workflow adoption is persisted per workspace or per repository binding."
    minRows={4}
    maxRows={10}
    appearance="outline"
    showSubmitButton={false}
  >
    <Stack slot="content" orientation="horizontal" gap="tiny" wrap>
      <Chip label="SYM-479" icon="clipboardTask" appearance="soft" size="small" />
      <Chip label="pixel-brewery/symphony" icon="github" appearance="soft" size="small" />
      <Chip label="repository-investigator" icon="skills" appearance="soft" size="small" />
      <Chip label="claude-opus" icon="claude" appearance="soft" size="small" />
    </Stack>
  </PromptBox>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['outline', 'soft', 'plain'] as const).map((appearance) => (
      <Stack key={appearance} orientation="vertical" gap="tiny">
        <Hint text={`appearance="${appearance}"`} />
        <PromptBox
          appearance={appearance}
          label="Ask the delivery agent"
          value="Rebase onto main and re-run the failing job."
          minRows={2}
          maxRows={6}
        />
      </Stack>
    ))}
  </Stack>
);

export const ReadonlyAndDisabled = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="vertical" gap="tiny">
      <Text text="Submitted prompt, kept for the record" wrap />
      <PromptBox
        readonly
        showSubmitButton={false}
        appearance="outline"
        label="Delivery instruction"
        value="Rename the four renderer files with git mv and update the barrel exports."
        minRows={3}
      />
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text text="No AI account is connected" wrap />
      <PromptBox
        disabled
        showSubmitButton={false}
        appearance="outline"
        label="Describe the issue"
        value="Connect a Claude or Codex account in Settings to draft work items."
        minRows={3}
      />
    </Stack>
  </Stack>
);
