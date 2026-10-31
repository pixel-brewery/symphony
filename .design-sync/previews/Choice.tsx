import { Badge, Choice, ChoiceGroup, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const AiProviderCards = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="AI provider" wrap />
    <ChoiceGroup
      name="ai-runtime"
      orientation="horizontal"
      appearance="outline"
      variant="primary"
      value="claude"
    >
      <Choice
        value="claude"
        appearance="outline"
        variant="primary"
        icon="claude"
        label="Claude Code"
        additional="CLI detected · 2 accounts connected"
      />
      <Choice
        value="codex"
        appearance="outline"
        variant="primary"
        icon="openai"
        label="Codex"
        additional="CLI detected · 1 account connected"
      />
      <Choice
        value="opencode"
        appearance="outline"
        variant="primary"
        icon="bot"
        label="OpenCode"
        additional="CLI not installed"
        disabled
      />
    </ChoiceGroup>
  </Stack>
);

export const AdditionalText = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Reasoning effort" wrap />
    <ChoiceGroup
      name="ai-reasoning"
      orientation="vertical"
      appearance="outline"
      variant="primary"
      value="high"
    >
      <Choice
        value="low"
        appearance="outline"
        variant="primary"
        label="Low"
        additional="Fastest. Good enough for renames and lint fixes."
      />
      <Choice
        value="high"
        appearance="outline"
        variant="primary"
        label="High"
        additional="Default for delivery runs. Reads the instruction files before editing."
      />
      <Choice
        value="max"
        appearance="outline"
        variant="primary"
        label="Maximum"
        additional="Reserved for architecture work. Burns the quota quickly."
      />
    </ChoiceGroup>
  </Stack>
);

export const RichLabelSlots = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Delivery target" wrap />
    <ChoiceGroup
      name="delivery-target"
      orientation="vertical"
      appearance="outline"
      variant="primary"
      value="github"
    >
      <Choice value="github" appearance="outline" variant="primary" icon="github">
        <Stack slot="label" orientation="horizontal" gap="small" verticalAlignment="center">
          <Text text="pixel-brewery/symphony" />
          <Badge appearance="soft" variant="success" label="Connected" size="small" />
        </Stack>
        <Text
          slot="additional"
          text="Default branch main · branch protection on"
          variant="neutral"
          wrap
        />
      </Choice>
      <Choice value="azure" appearance="outline" variant="primary" icon="azureDevOps">
        <Stack slot="label" orientation="horizontal" gap="small" verticalAlignment="center">
          <Text text="flamox365/platform-engine" />
          <Badge appearance="soft" variant="warning" label="Token expires in 3 days" size="small" />
        </Stack>
        <Text
          slot="additional"
          text="Default branch develop · pull requests require two reviewers"
          variant="neutral"
          wrap
        />
      </Choice>
    </ChoiceGroup>
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="large">
    {(['outline', 'soft', 'plain'] as const).map((appearance) => (
      <Stack key={appearance} orientation="vertical" gap="small">
        <Text text={appearance} variant="neutral" wrap />
        <ChoiceGroup
          name={`workflow-${appearance}`}
          orientation="horizontal"
          appearance={appearance}
          variant="primary"
          value="ready"
        >
          <Choice value="qualified" appearance={appearance} variant="primary" label="Qualified" />
          <Choice value="ready" appearance={appearance} variant="primary" label="Ready" />
          <Choice value="delivered" appearance={appearance} variant="primary" label="Delivered" />
        </ChoiceGroup>
      </Stack>
    ))}
  </Stack>
);
