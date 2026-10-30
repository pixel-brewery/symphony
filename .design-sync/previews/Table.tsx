import {
  Card,
  CardContent,
  CardHeader,
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

// The table hands its `columns` track list to every row, so one string here
// aligns the header and the body. Four or five tracks is what fits a panel.
const deliveryColumns = '1.9fr 1.5fr 0.8fr 1fr 0.8fr';

const status = (label: string, variant: 'success' | 'info' | 'danger' | 'warning' | 'neutral') => (
  <Chip label={label} size="tiny" appearance="soft" variant={variant} />
);

export const DeliveriesTable = () => (
  <Table
    columns={deliveryColumns}
    caption="Deliveries · pixel-brewery/symphony"
    alternating
    appearance="outline"
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

export const SelectableRows = () => (
  <Table
    columns="2fr 1.2fr 1fr"
    caption="Pick the deliveries to retry"
    selectionMode="multiple"
    selectionType="row"
    selectionColumn
    rowClickSelects={false}
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Work item" />
        <TableHeaderCell text="Workspace" />
        <TableHeaderCell text="Status" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow isSelected>
        <TableBodyCell text="SYM-471 Storage governor" />
        <TableBodyCell text="symphony" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow isSelected>
        <TableBodyCell text="SYM-455 Runner image parity" />
        <TableBodyCell text="symphony" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="SYM-431 Preview paths" />
        <TableBodyCell text="symphony" />
        <TableBodyCell>{status('In review', 'info')}</TableBodyCell>
      </TableBodyRow>
      <TableBodyRow disabled>
        <TableBodyCell text="SYM-201 Archived item" />
        <TableBodyCell text="flamox365" />
        <TableBodyCell>{status('Archived', 'neutral')}</TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
);

// A table dropped into a card is how a Symphony settings page shows one; the
// card already draws the frame, so the table itself goes plain.
export const TableInsideCard = () => (
  <Card>
    <CardHeader text="Skills" subText="Which skill each process role resolves to." />
    <CardContent>
      <Table appearance="plain" columns="1.3fr 1.5fr 0.9fr" alternating>
        <TableHeader>
          <TableHeaderRow>
            <TableHeaderCell text="Role" />
            <TableHeaderCell text="Skill" />
            <TableHeaderCell text="Source" />
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          <TableBodyRow>
            <TableBodyCell text="Analysis" />
            <TableBodyCell text="analyze-change-request" />
            <TableBodyCell text="Repository" />
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell text="Implementation" />
            <TableBodyCell text="solve-change-request" />
            <TableBodyCell text="Repository" />
          </TableBodyRow>
          <TableBodyRow>
            <TableBodyCell text="Verification" />
            <TableBodyCell text="definition-of-done" />
            <TableBodyCell text="Built-in" />
          </TableBodyRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const CaptionAndSummary = () => (
  <Table columns="1.6fr 1fr 1fr 0.8fr" appearance="outline" alternating>
    <Stack slot="caption" orientation="horizontal" gap="small" verticalAlignment="center">
      <Icon icon="executionOutline" size="small" variant="primary" />
      <Text text="Executions · last 24 hours" wrap />
    </Stack>
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
        <TableBodyCell>{status('Succeeded', 'success')}</TableBodyCell>
        <TableBodyCell text="6m 31s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="exec-9f18" />
        <TableBodyCell text="Codex" />
        <TableBodyCell>{status('Cancelled', 'warning')}</TableBodyCell>
        <TableBodyCell text="0m 44s" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="exec-9f14" />
        <TableBodyCell text="Claude" />
        <TableBodyCell>{status('Failed', 'danger')}</TableBodyCell>
        <TableBodyCell text="11m 03s" />
      </TableBodyRow>
    </TableBody>
    <Text slot="summary" text="3 executions · 1 failed · 18m 18s of agent time" wrap />
  </Table>
);
