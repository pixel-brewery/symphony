import { Avatar, AvatarGroup, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const BoardItemAssignees = () => (
  <AvatarGroup size="tiny" appearance="soft" variant="primary" maxLength={3}>
    <Avatar text="Andre Wehlert" />
    <Avatar text="Mira Osei" />
    <Avatar text="Jonas Bleeker" />
    <Avatar text="Priya Raman" />
    <Avatar text="Tom Alders" />
  </AvatarGroup>
);

export const AgentProviders = () => (
  <AvatarGroup size="small">
    <Avatar icon="bot" appearance="soft" />
    <Avatar icon="claude" appearance="soft" variant="highlight" />
    <Avatar icon="github" appearance="outline" />
  </AvatarGroup>
);

export const Overflow = () => (
  <Stack orientation="vertical" gap="medium">
    <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
      <AvatarGroup size="small" appearance="soft" variant="primary" maxLength={2}>
        <Avatar text="Andre Wehlert" />
        <Avatar text="Mira Osei" />
        <Avatar text="Jonas Bleeker" />
        <Avatar text="Priya Raman" />
      </AvatarGroup>
      <Text text="maxLength=2" variant="neutral" />
    </Stack>
    <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
      <AvatarGroup size="small" appearance="soft" variant="primary" maxLength={4}>
        <Avatar text="Andre Wehlert" />
        <Avatar text="Mira Osei" />
        <Avatar text="Jonas Bleeker" />
        <Avatar text="Priya Raman" />
      </AvatarGroup>
      <Text text="maxLength=4" variant="neutral" />
    </Stack>
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="vertical" gap="medium">
    {(['tiny', 'small', 'medium', 'large'] as const).map((size) => (
      <AvatarGroup key={size} size={size} appearance="soft" variant="primary" maxLength={3}>
        <Avatar text="Andre Wehlert" />
        <Avatar text="Mira Osei" />
        <Avatar text="Jonas Bleeker" />
        <Avatar text="Priya Raman" />
      </AvatarGroup>
    ))}
  </Stack>
);
