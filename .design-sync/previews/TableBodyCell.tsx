import {
  Avatar,
  Chip,
  Icon,
  Stack,
  Table,
  TableBody,
  TableBodyCell,
  TableBodyRow,
  TableHeader,
  TableHeaderCell,
  TableHeaderRow,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const columns = '1.9fr 1.5fr 0.8fr 1fr 0.8fr';

const status = (label: string, variant: 'success' | 'info' | 'danger' | 'neutral') => (
  <Chip label={label} size="tiny" appearance="soft" variant={variant} />
);

export const TextCells = () => (
  <Table
    columns={columns}
    caption="Deliveries · pixel-brewery/symphony"
    appearance="outline"
    alternating
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Work item" />
        <TableHeaderCell text="Branch" />
        <TableHeaderCell text="Agent" />
        <TableHeaderCell text="Status" />
        <TableHeaderCell text="Runtime" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="SYM-431 Preview paths" />
        <TableBodyCell text="codex/fix-ci-paths" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('In review', 'info')}</TableBodyCell>
        <TableBodyCell text="4m 12s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-479 Workflow versions" />
        <TableBodyCell text="claude/workflow-ver" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Merged', 'success')}</TableBodyCell>
        <TableBodyCell text="2m 48s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-471 Storage governor" />
        <TableBodyCell text="claude/storage-gov" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
        <TableBodyCell text="11m 03s" />
      </TableBodyRow>
    </TableBody>
  </Table>
);

// A cell's `text` is only the fallback of its default slot: pass children and the
// cell hosts whatever the column really needs to show.
export const CellsWithContent = () => (
  <Table
    columns="1.9fr 1.4fr 1fr 1fr"
    caption="Agent accounts per workspace"
    appearance="outline"
    alternating
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Workspace" />
        <TableHeaderCell text="Account" />
        <TableHeaderCell text="Provider" />
        <TableHeaderCell text="State" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="folder" size="small" variant="primary" />
            <Text text="symphony" />
          </Stack>
        </TableBodyCell>
        <TableBodyCell text="RueDeRennes" />
        <TableBodyCell>
          <Avatar icon="github" size="tiny" appearance="soft" />
        </TableBodyCell>
        <TableBodyCell>{status('Connected', 'success')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="folder" size="small" variant="primary" />
            <Text text="flamox365" />
          </Stack>
        </TableBodyCell>
        <TableBodyCell text="anthropic@…" />
        <TableBodyCell>
          <Avatar icon="claude" size="tiny" appearance="soft" />
        </TableBodyCell>
        <TableBodyCell>{status('Connected', 'success')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="folder" size="small" variant="primary" />
            <Text text="mosaik" />
          </Stack>
        </TableBodyCell>
        <TableBodyCell text="Codex" />
        <TableBodyCell>
          <Avatar icon="openai" size="tiny" appearance="soft" />
        </TableBodyCell>
        <TableBodyCell>{status('Signed out', 'neutral')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);

// Cells truncate by default; `textOverflow="wrap"` is how a message column keeps
// the whole failure reason.
export const TruncatedAndWrapped = () => (
  <Table
    columns="0.8fr 2.4fr"
    caption="Truncated identifier, wrapped failure reason"
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Execution" />
        <TableHeaderCell text="Failure reason" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="exec-9f14" />
        <TableBodyCell
          textOverflow="wrap"
          text="Managed workspace path exceeded the unix socket limit while starting the agent runtime."
        />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="exec-9f0b" />
        <TableBodyCell
          textOverflow="wrap"
          text="The orchestrator loop was blocked by a synchronous disk walk in StorageGovernor."
        />
      </TableBodyRow>
    </TableBody>
  </Table>
);

export const SelectedCell = () => (
  <Table
    columns="1.4fr 1fr 1fr 0.8fr"
    caption="Cell selection picks a single value, not a whole row"
    selectionMode="single"
    selectionType="cell"
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Execution" />
        <TableHeaderCell text="Agent" />
        <TableHeaderCell text="Outcome" />
        <TableHeaderCell text="Runtime" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="exec-9f21" />
        <TableBodyCell text="Claude" />
        <TableBodyCell text="Succeeded" />
        <TableBodyCell text="6m 31s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="exec-9f18" />
        <TableBodyCell text="Codex" isSelected />
        <TableBodyCell text="Cancelled" />
        <TableBodyCell text="0m 44s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="exec-9f14" />
        <TableBodyCell text="Claude" />
        <TableBodyCell text="Failed" />
        <TableBodyCell text="11m 03s" />
      </TableBodyRow>
    </TableBody>
  </Table>
);
