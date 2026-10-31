import {
  Avatar,
  Button,
  Chip,
  Page,
  PageContent,
  PageHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const HeaderWithActions = () => (
  <Page>
    <PageHeader text="symphony" subText="Managed workspace · main is 3 commits ahead" inset="all">
      <Avatar slot="prefix" icon="github" appearance="soft" size="small" />
      <Stack slot="suffix" orientation="horizontal" gap="small" verticalAlignment="center">
        <Button label="Sync" icon="sync" appearance="outline" />
        <Button label="Start delivery" icon="play" variant="primary" appearance="solid" />
      </Stack>
    </PageHeader>
    <PageContent inset="all">
      <Text text="Every delivery runs in its own worktree under the managed workspace root." wrap />
    </PageContent>
  </Page>
);

export const HeaderWithAdditionalText = () => (
  <Page>
    <PageHeader
      text="SYM-482 · Fix CI case-sensitive paths"
      subText="Opened by RueDeRennes · claude-opus-5"
      additionalText="Last execution finished 4 minutes ago"
      inset="all"
    >
      <Chip slot="suffix" label="In review" variant="info" appearance="soft" size="small" />
    </PageHeader>
    <PageContent inset="all">
      <Text text="Branch codex/fix-ci-case-paths is ready for review." wrap />
    </PageContent>
  </Page>
);

export const MinimalHeader = () => (
  <Page>
    <PageHeader text="Settings" inset="all" />
    <PageContent inset="all">
      <Text text="Accounts, skills, workspaces, and storage safety." wrap />
    </PageContent>
  </Page>
);

export const HeaderInsets = () => (
  <Stack orientation="vertical" gap="medium">
    <Page>
      <PageHeader text="Inset all" subText="Padding on every side" inset="all" />
    </Page>
    <Page>
      <PageHeader
        text="Inset horizontal"
        subText="Padding left and right only"
        inset="horizontal"
      />
    </Page>
    <Page>
      <PageHeader text="Inset none" subText="Flush with the page edge" inset="none" />
    </Page>
  </Stack>
);
