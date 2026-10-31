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

// TableHeader has no props of its own: it is the section that groups the header
// rows of a table and picks up the parent table's column tracks.
const columns = '1.9fr 1.5fr 0.8fr 1fr 0.8fr';

const status = (label: string, variant: 'success' | 'info' | 'danger' | 'neutral') => (
  <Chip label={label} size="tiny" appearance="soft" variant={variant} />
);

const deliveryRows = (
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

export const DeliveryColumnHeader = () => (
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
    {deliveryRows}
  </Table>
);

// The header stays put while the body scrolls inside the table's viewport.
export const HeaderOverScrollingRows = () => (
  <Table
    style={{ height: '320px' }}
    columns="1.2fr 1.6fr 1fr 0.9fr"
    caption="Executions · last 24 hours"
    appearance="outline"
    alternating
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Execution" />
        <TableHeaderCell text="Skill" />
        <TableHeaderCell text="Agent" />
        <TableHeaderCell text="Runtime" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      {[
        ['exec-9f24', 'solve-change-request', 'Claude', '2m 11s'],
        ['exec-9f21', 'solve-change-request', 'Claude', '6m 31s'],
        ['exec-9f18', 'analyze-change-request', 'Codex', '0m 44s'],
        ['exec-9f14', 'definition-of-done', 'Claude', '11m 03s'],
        ['exec-9f11', 'analyze-change-request', 'Codex', '1m 07s'],
        ['exec-9f08', 'maintain-documentation', 'Claude', '3m 52s'],
        ['exec-9f05', 'repair-ci-failure', 'Codex', '5m 19s'],
        ['exec-9f02', 'diagnose-ci-failure', 'Claude', '0m 58s'],
      ].map(([id, skill, agent, runtime]) => (
        <TableBodyRow key={id}>
          <TableBodyCell text={id} />
          <TableBodyCell text={skill} />
          <TableBodyCell text={agent} />
          <TableBodyCell text={runtime} />
        </TableBodyRow>
      ))}
    </TableBody>
  </Table>
);

export const HeaderWithSelectionColumn = () => (
  <Table
    columns="2fr 1.6fr 1fr"
    caption="Retry failed deliveries"
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
      <TableBodyRow>
        <TableBodyCell text="SYM-431 Preview paths" />
        <TableBodyCell text="codex/fix-ci-paths" />
        <TableBodyCell>{status('In review', 'info')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);
