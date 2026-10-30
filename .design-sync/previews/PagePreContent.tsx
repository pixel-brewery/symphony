import {
  Banner,
  Chip,
  Page,
  PageContent,
  PageHeader,
  PagePreContent,
  Searchbox,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const StaleDataBanner = () => (
  <Page>
    <PageHeader text="Board" subText="flamox365 / symphony" inset="all" />
    <PagePreContent inset="horizontal">
      <Banner
        isOpen
        appearance="soft"
        variant="warning"
        icon="errorCircle"
        iconSize="small"
        header="Showing cached work items"
        subHeader="The last GitHub sync failed 12 minutes ago."
      />
    </PagePreContent>
    <PageContent inset="all">
      <Text text="14 work items · 3 deliveries running" wrap />
    </PageContent>
  </Page>
);

export const SearchAndFilters = () => (
  <Page>
    <PageHeader text="Tickets" subText="Everything assigned to this workspace" inset="all" />
    <PagePreContent inset="horizontal">
      <Stack orientation="vertical" gap="small">
        <Searchbox placeholder="Title or ticket ID" value="case-sensitive" isClearable />
        <Stack orientation="horizontal" gap="small" wrap>
          <Chip label="Ready" size="small" appearance="soft" variant="info" isCheckable isChecked />
          <Chip label="In review" size="small" appearance="soft" isCheckable />
          <Chip label="Blocked" size="small" appearance="soft" isCheckable />
        </Stack>
      </Stack>
    </PagePreContent>
    <PageContent inset="all">
      <Text text="3 of 14 tickets match this filter." wrap />
    </PageContent>
  </Page>
);

export const PreContentInsets = () => (
  <Stack orientation="vertical" gap="medium">
    <Page>
      <PageHeader text="Inset horizontal" inset="all" />
      <PagePreContent inset="horizontal">
        <Banner
          isOpen
          appearance="soft"
          variant="info"
          icon="info"
          iconSize="small"
          header="Codex is out of quota until 18:40."
        />
      </PagePreContent>
    </Page>
    <Page>
      <PageHeader text="Inset all" inset="all" />
      <PagePreContent inset="all">
        <Banner
          isOpen
          appearance="soft"
          variant="success"
          icon="checkCircle"
          iconSize="small"
          header="Pull request #218 merged into main."
        />
      </PagePreContent>
    </Page>
  </Stack>
);
