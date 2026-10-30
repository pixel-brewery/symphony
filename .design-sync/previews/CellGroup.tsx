import { Avatar, Button, Cell, CellGroup, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceTeam = () => (
  <CellGroup header="Role assignments">
    <Cell label="Analysis" subLabel="Claude Opus 5 · Backup: Codex" />
    <Cell label="Implementation" subLabel="Claude Opus 5 · Backup: Codex, Claude Sonnet" />
    <Cell label="Review" subLabel="Codex · no backup configured" />
  </CellGroup>
);

export const GroupedSections = () => (
  <Stack orientation="vertical" gap="medium">
    <CellGroup header="Connected services">
      <Cell label="GitHub" subLabel="RueDeRennes · 4 repositories bound">
        <Avatar slot="start" size="small" appearance="soft" icon="github" />
        <Text slot="end" text="Connected" variant="success" />
      </Cell>
      <Cell label="Azure DevOps" subLabel="No organization connected">
        <Avatar slot="start" size="small" appearance="soft" icon="azureDevOps" />
        <Button slot="end" label="Connect" appearance="outline" variant="primary" />
      </Cell>
    </CellGroup>
    <CellGroup header="AI accounts">
      <Cell label="Claude" subLabel="Subscription account · signed in">
        <Avatar slot="start" size="small" appearance="soft" icon="claude" />
        <Text slot="end" text="Ready" variant="success" />
      </Cell>
      <Cell label="Codex" subLabel="Out of quota until 18:40">
        <Avatar slot="start" size="small" appearance="soft" icon="openai" />
        <Text slot="end" text="Paused" variant="warning" />
      </Cell>
    </CellGroup>
  </Stack>
);

export const WithoutHeader = () => (
  <CellGroup>
    <Cell label="Keep awake" subLabel="Active while a delivery is running" />
    <Cell label="Automatic updates" subLabel="Checked hourly · currently up to date" />
  </CellGroup>
);

export const StorageBreakdown = () => (
  <CellGroup header="All managed Symphony data">
    <Cell label="Workspaces" subLabel="12.6 GB across 6 workspaces" />
    <Cell label="Execution logs" subLabel="3.7 GB · 2.1 GB reclaimable" />
    <Cell label="Runner images" subLabel="2.1 GB · Ubuntu 24.04 arm64" />
  </CellGroup>
);
