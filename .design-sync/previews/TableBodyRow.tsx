import {
  Chip,
  Table,
  TableBody,
  TableBodyCell,
  TableBodyRow,
  TableHeader,
  TableHeaderCell,
  TableHeaderRow,
} from '@pixel-brewery/mosaik-elements-react';

const columns = '1.9fr 1.5fr 0.8fr 1fr 0.8fr';

const status = (label: string, variant: 'success' | 'info' | 'danger' | 'warning' | 'neutral') => (
  <Chip label={label} size="tiny" appearance="soft" variant={variant} />
);

const deliveryHeader = (
  <TableHeader>
    <TableHeaderRow>
      <TableHeaderCell text="Work item" />
      <TableHeaderCell text="Branch" />
      <TableHeaderCell text="Agent" />
      <TableHeaderCell text="Status" />
      <TableHeaderCell text="Runtime" />
    </TableHeaderRow>
  </TableHeader>
);

export const DeliveryRow = () => (
  <Table
    columns={columns}
    caption="Deliveries · pixel-brewery/symphony"
    appearance="outline"
    alternating
  >
    {deliveryHeader}
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

export const SelectedRow = () => (
  <Table
    columns={columns}
    caption="The row the detail pane is showing"
    selectionMode="single"
    selectionType="row"
    appearance="outline"
  >
    {deliveryHeader}
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="SYM-431 Preview paths" />
        <TableBodyCell text="codex/fix-ci-paths" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('In review', 'info')}</TableBodyCell>
        <TableBodyCell text="4m 12s" />
      </TableBodyRow>
      <TableBodyRow isSelected>
        <TableBodyCell text="SYM-471 Storage governor" />
        <TableBodyCell text="claude/storage-gov" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
        <TableBodyCell text="11m 03s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-465 Segment bar hints" />
        <TableBodyCell text="codex/segment-bar" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Queued', 'neutral')}</TableBodyCell>
        <TableBodyCell text="—" />
      </TableBodyRow>
    </TableBody>
  </Table>
);

export const DisabledRow = () => (
  <Table
    columns={columns}
    caption="Archived work items cannot be delivered again"
    appearance="outline"
  >
    {deliveryHeader}
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="SYM-479 Workflow versions" />
        <TableBodyCell text="claude/workflow-ver" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Merged', 'success')}</TableBodyCell>
        <TableBodyCell text="2m 48s" />
      </TableBodyRow>
      <TableBodyRow disabled>
        <TableBodyCell text="SYM-201 Legacy importer" />
        <TableBodyCell text="codex/legacy-import" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Archived', 'neutral')}</TableBodyCell>
        <TableBodyCell text="—" />
      </TableBodyRow>
      <TableBodyRow disabled>
        <TableBodyCell text="SYM-188 Old board layout" />
        <TableBodyCell text="codex/old-board" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Archived', 'neutral')}</TableBodyCell>
        <TableBodyCell text="—" />
      </TableBodyRow>
    </TableBody>
  </Table>
);

export const RowsWithSelectionColumn = () => (
  <Table
    columns="2fr 1.6fr 1fr"
    caption="Retry the failed deliveries"
    selectionMode="multiple"
    selectionColumn
    rowClickSelects={false}
    appearance="outline"
    alternating
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
      <TableBodyRow isSelected>
        <TableBodyCell text="SYM-455 Runner image parity" />
        <TableBodyCell text="codex/runner-image" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-431 Preview paths" />
        <TableBodyCell text="codex/fix-ci-paths" />
        <TableBodyCell>{status('In review', 'info')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);
