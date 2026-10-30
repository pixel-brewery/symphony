import {
  Banner,
  Chip,
  Button,
  Card,
  CardContent,
  CardHeader,
  Page,
  PageContent,
  PageHeader,
  PagePreContent,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const BoardPage = () => (
  <Page>
    <PageHeader text="Symphony" subText="14 work items · 3 deliveries running" inset="all">
      <Button slot="suffix" label="New work item" icon="add" appearance="outline" />
    </PageHeader>
    <PageContent inset="all">
      <Stack orientation="vertical" gap="medium">
        <Card>
          <CardHeader text="SYM-482 · Fix CI case-sensitive paths" subText="Ready · claude-opus" />
          <CardContent text="Renderer file names diverge between macOS and the Linux runner." />
        </Card>
        <Card>
          <CardHeader text="SYM-479 · Persist workflow versions" subText="In review · codex" />
          <CardContent text="Adopted workflow versions must survive a settings reload." />
        </Card>
      </Stack>
    </PageContent>
  </Page>
);

export const PageWithPreContent = () => (
  <Page>
    <PageHeader text="Deliveries" subText="flamox365 / symphony" inset="all" />
    <PagePreContent inset="horizontal">
      <Banner
        isOpen
        appearance="soft"
        variant="warning"
        icon="errorCircle"
        iconSize="small"
        header="Board data is stale"
        subHeader="The last GitHub sync failed 12 minutes ago."
      />
    </PagePreContent>
    <PageContent inset="all">
      <Text text="Deliveries continue to run against the cached work item snapshot." wrap />
    </PageContent>
  </Page>
);

export const PageWithFooter = () => (
  <Page>
    <PageHeader text="Workspace storage" subText="18.4 GB across 6 workspaces" inset="all">
      <Chip
        slot="suffix"
        label="2.1 GB reclaimable"
        variant="info"
        appearance="soft"
        size="small"
      />
    </PageHeader>
    <PageContent inset="all">
      <Stack orientation="vertical" gap="small">
        <Text text="symphony · 8.2 GB" wrap />
        <Text text="mosaik · 6.1 GB" wrap />
        <Text text="flamox · 4.1 GB" wrap />
      </Stack>
    </PageContent>
    <Stack slot="footer" orientation="horizontal" gap="small" horizontalAlignment="right">
      <Button label="Reclaim space" variant="primary" appearance="solid" icon="delete" />
    </Stack>
  </Page>
);
