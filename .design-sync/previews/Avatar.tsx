import { Avatar, Stack } from '@pixel-brewery/mosaik-elements-react';

export const Assignees = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
    <Avatar text="Andre Wehlert" size="small" appearance="soft" variant="primary" />
    <Avatar text="Mira Osei" size="small" appearance="soft" variant="primary" />
    <Avatar text="jdoe" size="small" appearance="soft" variant="primary" />
    <Avatar text="Symphony Release Bot" size="small" appearance="soft" variant="neutral" />
  </Stack>
);

export const AccountProviders = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
    <Avatar icon="github" size="medium" appearance="soft" />
    <Avatar icon="claude" size="medium" appearance="soft" variant="highlight" />
    <Avatar icon="openai" size="medium" appearance="soft" variant="info" />
    <Avatar icon="azureDevOps" size="medium" appearance="soft" variant="secondary" />
    <Avatar icon="bot" size="medium" appearance="soft" variant="primary" />
    <Avatar icon="claude" size="medium" appearance="soft" variant="highlight" disabled />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
    <Avatar icon="person" size="medium" appearance="solid" variant="primary" />
    <Avatar icon="person" size="medium" appearance="soft" variant="primary" />
    <Avatar icon="person" size="medium" appearance="outline" variant="primary" />
    <Avatar icon="person" size="medium" appearance="plain" variant="primary" />
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center" wrap>
    <Avatar text="WS 7" size="tiny" appearance="soft" />
    <Avatar text="WS 7" size="small" appearance="soft" />
    <Avatar text="WS 7" size="medium" appearance="soft" />
    <Avatar text="WS 7" size="large" appearance="soft" />
    <Avatar text="WS 7" size="giant" appearance="soft" />
  </Stack>
);
