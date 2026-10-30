import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableBodyCell,
  TableBodyRow,
  TableHeader,
  TableHeaderCell,
  TableHeaderRow,
} from '@pixel-brewery/mosaik-elements-react';

const columns = '1.9fr 1.5fr 0.8fr 1fr 0.8fr';

const status = (label: string, variant: 'success' | 'info' | 'danger' | 'neutral') => (
  <Chip label={label} size="tiny" appearance="soft" variant={variant} />
);

const executionRows = (
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
);

export const ColumnLabels = () => (
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
    {executionRows}
  </Table>
);

export const SelectionCheckboxRow = () => (
  <Table
    columns="2fr 1.6fr 1fr"
    caption="Select the deliveries to retry"
    selectionMode="multiple"
    selectionColumn
    rowClickSelects={false}
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Work item" />
        <TableHeaderCell text="Branch" />
        <TableHeaderCell text="Status" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow isSelected>
        <TableBodyCell text="SYM-471 Storage governor" />
        <TableBodyCell text="claude/storage-gov" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-455 Runner image parity" />
        <TableBodyCell text="codex/runner-image" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);

// The header row lays itself out on the parent table's `columns` track list, so
// the same row renders equal columns or a fixed-plus-flexible mix.
export const ColumnTracks = () => (
  <Stack orientation="vertical" gap="medium">
    {(['1fr 1fr 1fr', '220px 1fr 90px'] as const).map((tracks) => (
      <Table key={tracks} columns={tracks} caption={`columns="${tracks}"`} appearance="outline">
        <TableHeader>
          <TableHeaderRow>
            <TableHeaderCell text="Execution" />
            <TableHeaderCell text="Skill" />
            <TableHeaderCell text="Runtime" />
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          <TableBodyRow>
            <TableBodyCell text="exec-9f21" />
            <TableBodyCell text="solve-change-request" />
            <TableBodyCell text="6m 31s" />
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell text="exec-9f18" />
            <TableBodyCell text="analyze-change-request" />
            <TableBodyCell text="0m 44s" />
          </TableBodyRow>
        </TableBody>
      </Table>
    ))}
  </Stack>
);
