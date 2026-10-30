import { Hint, Passwordbox, Stack } from '@pixel-brewery/mosaik-elements-react';

export const PersonalAccessToken = () => (
  <Stack orientation="vertical" gap="small">
    <Passwordbox
      label="Personal access token"
      placeholder="Paste the PAT from Azure DevOps"
      value="ado-pat-7f3c9a1e4b20"
      revealable
      isClearable
    />
    <Hint
      text="The token is handed to the Azure DevOps client once and never stored by Symphony."
      textOverflow="wrap"
    />
  </Stack>
);

export const RevealState = () => (
  <Stack orientation="vertical" gap="medium">
    <Passwordbox label="OpenAI API key" value="sk-symphony-9f2a41cd" revealable />
    <Passwordbox
      label="OpenAI API key (revealed)"
      value="sk-symphony-9f2a41cd"
      revealable
      isReveal
    />
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Passwordbox label="GitHub token" placeholder="ghp_…" required />
    <Passwordbox label="GitHub token" value="ghp_shorttoken" invalid variant="danger" />
    <Passwordbox label="GitHub token" value="ghp_managedbykeychain" readonly />
    <Passwordbox label="GitHub token" value="ghp_managedbykeychain" disabled />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['solid', 'soft', 'outline', 'plain'] as const).map((appearance) => (
      <Passwordbox
        key={appearance}
        appearance={appearance}
        label={`Claude API key (${appearance})`}
        value="sk-ant-symphony"
        revealable
      />
    ))}
  </Stack>
);
