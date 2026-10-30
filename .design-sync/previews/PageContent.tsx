import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Cell,
  EmptyState,
  Page,
  PageContent,
  PageHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const SettingsContent = () => (
  <Page>
    <PageHeader text="Storage safety" subText="Limits and the Mac free-space reserve" inset="all" />
    <PageContent inset="all">
      <Stack orientation="vertical" gap="medium">
        <Card>
          <CardHeader
            text="Managed workspace root"
            subText="~/Library/Application Support/Symphony"
          />
          <CardContent text="18.4 GB used · 2.1 GB reclaimable from finished executions." />
        </Card>
        <Card>
          <CardHeader text="Free-space reserve" subText="Deliveries stop before the disk fills" />
          <CardContent text="Symphony keeps 12 GB free on this Mac at all times." />
        </Card>
      </Stack>
    </PageContent>
  </Page>
);

export const CenteredEmptyContent = () => (
  <Page>
    <PageHeader text="Executions" subText="This workspace has never run an agent" inset="all" />
    <PageContent inset="all" verticalAlignment="center" horizontalAlignment="center">
      <Stack orientation="vertical" gap="medium" horizontalAlignment="center">
        <EmptyState
          icon="executionOutline"
          header="Nothing recorded yet"
          content="Runs appear here as soon as the first delivery starts."
        />
        <Button label="Start delivery" icon="play" variant="primary" appearance="solid" />
      </Stack>
    </PageContent>
  </Page>
);

export const ContentInsets = () => (
  <Stack orientation="vertical" gap="medium">
    <Page>
      <PageHeader text="Inset all" inset="all" />
      <PageContent inset="all">
        <Text text="Content is padded away from the page edge on every side." wrap />
      </PageContent>
    </Page>
    <Page>
      <PageHeader text="Inset none" inset="all" />
      <PageContent inset="none">
        <Text text="Content runs edge to edge — used for boards and tables." wrap />
      </PageContent>
    </Page>
  </Stack>
);

export const AccountRows = () => (
  <Page>
    <PageHeader text="Accounts" subText="Providers Symphony can run and push with" inset="all" />
    <PageContent inset="all">
      <Stack orientation="vertical" gap="small">
        <Cell label="GitHub" subLabel="RueDeRennes · connected" isNavigation />
        <Cell label="Claude" subLabel="contributor@example.invalid · connected" isNavigation />
        <Cell label="Codex" subLabel="Out of quota until 18:40" isNavigation />
      </Stack>
    </PageContent>
  </Page>
);
