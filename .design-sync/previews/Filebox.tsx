import { Button, Filebox, Icon, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const ManagedRoot = () => (
  <Filebox
    label="Managed root"
    value="/home/example/Library/Symphony/workspaces"
    directory
    readonly
  >
    <Button slot="suffix" icon="folder" appearance="plain" />
  </Filebox>
);

export const RepositoryBinding = () => (
  <Stack orientation="vertical" gap="medium">
    <Filebox label="Local checkout" value="/home/example/github/symphony" directory readonly>
      <Icon slot="prefix" icon="folderOpen" size="small" appearance="plain" />
    </Filebox>
    <Filebox
      label="Runner data"
      value="/home/example/Library/Symphony/local-ci"
      directory
      readonly
    />
    <Filebox label="Setup script" value=".symphony/setup.sh" accept={['.sh', '.zsh']} isClearable />
    <Text
      text="Symphony owns the mechanism; the setup script belongs to the repository binding."
      variant="neutral"
      wrap
    />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    <Filebox label="Default" appearance="default" value="/home/example/github/symphony" readonly />
    <Filebox label="Outline" appearance="outline" value="/home/example/github/symphony" readonly />
    <Filebox label="Soft" appearance="soft" value="/home/example/github/symphony" readonly />
    <Filebox label="Solid" appearance="solid" value="/home/example/github/symphony" readonly />
    <Filebox label="Plain" appearance="plain" value="/home/example/github/symphony" readonly />
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Filebox label="Skill bundle" value="review-german-eu-compliance.skill" isClearable />
    <Filebox label="Skill bundle (required, empty)" required />
    <Filebox
      label="Attachments"
      value="board-empty-state.png, execution-log.md"
      multiple
      accept={['.png', '.jpg', '.md']}
    />
    <Filebox label="Managed root" value="/home/example/Library/Symphony" directory disabled />
  </Stack>
);
