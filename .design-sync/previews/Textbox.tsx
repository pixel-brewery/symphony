import { Hint, Icon, Stack, Textbox } from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceFields = () => (
  <Stack orientation="vertical" gap="medium">
    <Textbox label="Name" value="Symphony desktop" />
    <Textbox label="Short code" value="SYM" />
    <Textbox label="Color (hex)" value="#B3261E" />
  </Stack>
);

export const MultilineInstructions = () => (
  <Stack orientation="vertical" gap="small">
    <Textbox
      label="Additional instructions"
      multiline
      multilineRows={6}
      value={
        'Always run yarn agents:check before handoff.\n' +
        'Never commit on inferred approval — ask per step.\n' +
        'Treat ../flamox and ../mosaik as read-only references.'
      }
    />
    <Hint text="Appended below the built-in instructions of the role." />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'outline', 'soft', 'plain'] as const).map((appearance) => (
      <Textbox
        key={appearance}
        label={`Pairing address (${appearance})`}
        appearance={appearance}
        value="https://symphony.local:7817/pair"
        readonly
      />
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Textbox label="Branch prefix" placeholder="symphony/" />
    <Textbox label="Claim branch" value="symphony/sym-418-socket-paths" isClearable />
    <Textbox label="Repository slug" value="pixel-brewery/symphony" readonly />
    <Textbox label="Resolving workspace" value="Managed worktree" isBusy />
    <Textbox label="Runner label" value="self-hosted-macos" disabled />
    <Textbox label="Webhook URL" value="not-a-url" variant="danger" required />
  </Stack>
);

export const WithPrefix = () => (
  <Stack orientation="vertical" gap="medium">
    <Textbox label="Repository" value="pixel-brewery/symphony">
      <Icon slot="prefix" icon="github" size="small" />
    </Textbox>
    <Textbox label="Default branch" value="main">
      <Icon slot="prefix" icon="branch" size="small" />
    </Textbox>
  </Stack>
);
