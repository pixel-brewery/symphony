import { Anchor, Badge, Icon, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const PullRequestLinks = () => (
  <Stack orientation="vertical" gap="small">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Icon icon="github" size="small" variant="neutral" />
      <Anchor
        label="fix(ci): keep renamed file paths case-sensitive"
        href="https://github.com/symphony/desktop/pull/482"
        target="_blank"
        rel="noreferrer"
        underline="hover"
      />
      <Badge label="Draft" appearance="soft" variant="neutral" />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Icon icon="github" size="small" variant="neutral" />
      <Anchor
        label="feat(board): adopt workflow version 4"
        href="https://github.com/symphony/desktop/pull/479"
        target="_blank"
        rel="noreferrer"
        underline="hover"
      />
      <Badge label="Open" appearance="soft" variant="success" />
    </Stack>
    <Text
      text="Links open in the system browser; Symphony never navigates the app window."
      variant="neutral"
      wrap
    />
  </Stack>
);

export const Underline = () => (
  <Stack orientation="vertical" gap="small">
    {(['hover', 'always', 'never'] as const).map((underline) => (
      <Anchor
        key={underline}
        label={`underline=${underline} — Action run #1284 on codex/fix-ci-case-paths`}
        href="https://github.com/symphony/desktop/actions/runs/1284"
        target="_blank"
        rel="noreferrer"
        underline={underline}
      />
    ))}
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['default', 'primary', 'success', 'warning', 'info', 'neutral'] as const).map((variant) => (
      <Anchor
        key={variant}
        variant={variant}
        underline="hover"
        label={`${variant} — open the execution log for 4f21a9`}
        href="https://github.com/symphony/desktop/actions"
        target="_blank"
        rel="noreferrer"
      />
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="small">
    <Anchor
      label="Enabled — review the delivery branch on GitHub"
      href="https://github.com/symphony/desktop/tree/codex/fix-ci-case-paths"
      target="_blank"
      rel="noreferrer"
      underline="hover"
    />
    <Anchor
      disabled
      label="Disabled — the repository binding has no remote yet"
      href="https://github.com/symphony/desktop"
      underline="hover"
    />
    <Anchor
      label="Download the execution transcript"
      href="https://github.com/symphony/desktop/raw/main/transcript.log"
      download="execution-4f21a9.log"
      underline="always"
      variant="primary"
    />
  </Stack>
);
