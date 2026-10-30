import { Chip, Icon, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const WorkItemMetadata = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Chips on a board card" wrap />
    <Stack orientation="horizontal" gap="small" wrap>
      <Chip
        label="codex/fix-ci-case-paths"
        icon="branch"
        appearance="soft"
        variant="neutral"
        size="tiny"
      />
      <Chip
        label="PR conflicts with base"
        icon="branch"
        appearance="soft"
        variant="warning"
        size="tiny"
      />
      <Chip label="Claude Code" icon="claude" appearance="soft" variant="highlight" size="tiny" />
      <Chip label="Closes #402" appearance="soft" variant="info" size="tiny" />
    </Stack>
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="large">
    {(['soft', 'outline', 'solid'] as const).map((appearance) => (
      <Stack key={appearance} orientation="vertical" gap="tiny">
        <Text text={appearance} variant="neutral" wrap />
        <Stack orientation="horizontal" gap="small" wrap>
          <Chip label="Running" appearance={appearance} variant="primary" />
          <Chip label="Merged" appearance={appearance} variant="success" />
          <Chip label="Conflicts" appearance={appearance} variant="warning" />
          <Chip label="Queued" appearance={appearance} variant="info" />
          <Chip label="Archived" appearance={appearance} variant="neutral" />
        </Stack>
      </Stack>
    ))}
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="vertical" gap="medium">
    {(['tiny', 'small', 'medium', 'large'] as const).map((size) => (
      <Stack key={size} orientation="horizontal" gap="small" verticalAlignment="center">
        <Chip
          label={`${size} · codex/fix-ci-case-paths`}
          icon="branch"
          appearance="soft"
          variant="neutral"
          size={size}
        />
      </Stack>
    ))}
  </Stack>
);

export const CheckableFilters = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Board filter · which agents to show" wrap />
    <Stack orientation="horizontal" gap="small" wrap>
      <Chip
        label="Claude Code"
        icon="claude"
        isCheckable
        isChecked
        appearance="soft"
        variant="primary"
      />
      <Chip label="Codex" icon="openai" isCheckable isChecked appearance="soft" variant="primary" />
      <Chip label="OpenCode" icon="bot" isCheckable appearance="soft" variant="primary" />
      <Chip label="Unassigned" isCheckable appearance="soft" variant="primary" />
    </Stack>
  </Stack>
);

export const CloseableAndDisabled = () => (
  <Stack orientation="vertical" gap="large">
    <Stack orientation="vertical" gap="tiny">
      <Text text="Active board filters, each removable" variant="neutral" wrap />
      <Stack orientation="horizontal" gap="small" wrap>
        <Chip label="Repository: symphony" closeable appearance="soft" variant="primary">
          <Icon slot="close" icon="clear" size="small" variant="primary" inline />
        </Chip>
        <Chip label="State: Ready" closeable appearance="soft" variant="primary">
          <Icon slot="close" icon="clear" size="small" variant="primary" inline />
        </Chip>
        <Chip label="Assignee: RueDeRennes" closeable appearance="soft" variant="primary">
          <Icon slot="close" icon="clear" size="small" variant="primary" inline />
        </Chip>
      </Stack>
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text text="Disabled — the binding is locked by the workspace owner" variant="neutral" wrap />
      <Stack orientation="horizontal" gap="small" wrap>
        <Chip
          label="Repository: mosaik"
          icon="github"
          appearance="soft"
          variant="neutral"
          disabled
        />
        <Chip label="Read-only reference" appearance="outline" variant="neutral" disabled />
      </Stack>
    </Stack>
  </Stack>
);
