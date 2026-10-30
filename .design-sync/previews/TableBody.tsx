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

// TableBody has no props of its own: it is the section that groups the data rows
// and inherits the parent table's column tracks.
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

export const DeliveryRows = () => (
  <Table columns={columns} caption="Deliveries · pixel-brewery/symphony" appearance="outline">
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

export const AlternatingRows = () => (
  <Table
    columns={columns}
    caption="Alternating rows keep long execution lists readable"
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
      <TableBodyRow>
        <TableBodyCell text="SYM-465 Segment bar hints" />
        <TableBodyCell text="codex/segment-bar" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Queued', 'neutral')}</TableBodyCell>
        <TableBodyCell text="—" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-455 Runner image parity" />
        <TableBodyCell text="codex/runner-image" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Cancelled', 'warning')}</TableBodyCell>
        <TableBodyCell text="0m 44s" />
      </TableBodyRow>
    </TableBody>
  </Table>
);

export const SingleRowBody = () => (
  <Table columns="1.6fr 1fr 1fr" caption="One execution is still running" appearance="outline">
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Execution" />
        <TableHeaderCell text="Agent" />
        <TableHeaderCell text="Status" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="exec-9f24" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Running', 'info')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);
