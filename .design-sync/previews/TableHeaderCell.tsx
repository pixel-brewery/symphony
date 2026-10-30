import {
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

export const ColumnHeadings = () => (
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

// `text` is only the fallback of the header cell's default slot: pass children
// and the heading can carry an icon.
export const HeadingsWithIcons = () => (
  <Table
    columns={columns}
    caption="Deliveries · pixel-brewery/symphony"
    appearance="outline"
    alternating
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="clipboardTask" size="tiny" />
            <Text text="Work item" />
          </Stack>
        </TableHeaderCell>
        <TableHeaderCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="branch" size="tiny" />
            <Text text="Branch" />
          </Stack>
        </TableHeaderCell>
        <TableHeaderCell>
          <Stack orientation="horizontal" gap="tiny" verticalAlignment="center">
            <Icon icon="bot" size="tiny" />
            <Text text="Agent" />
          </Stack>
        </TableHeaderCell>
        <TableHeaderCell text="Status" />
        <TableHeaderCell text="Runtime" />
      </TableHeaderRow>
    </TableHeader>
    {deliveryRows}
  </Table>
);

export const PinnedAndHiddenColumns = () => (
  <Table
    columns={columns}
    caption="Branch pinned left · the agent column is hidden"
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Work item" />
        <TableHeaderCell text="Branch" pinned="left" pinable />
        <TableHeaderCell text="Agent" columnHidden />
        <TableHeaderCell text="Status" />
        <TableHeaderCell text="Runtime" />
      </TableHeaderRow>
    </TableHeader>
    {deliveryRows}
  </Table>
);

export const WrappingHeadings = () => (
  <Table
    columns="1fr 1fr 1fr 1fr"
    caption="Long headings wrap instead of truncating"
    appearance="outline"
  >
    <TableHeader>
      <TableHeaderRow>
        <TableHeaderCell text="Managed workspace name" textOverflow="wrap" />
        <TableHeaderCell text="Delivery agent account" textOverflow="wrap" />
        <TableHeaderCell text="Pull request review state" textOverflow="wrap" />
        <TableHeaderCell text="Reclaimable disk space" textOverflow="wrap" />
      </TableHeaderRow>
    </TableHeader>
    <TableBody>
      <TableBodyRow>
        <TableBodyCell text="symphony" />
        <TableBodyCell text="anthropic@…" />
        <TableBodyCell>{status('Open', 'info')}</TableBodyCell>
        <TableBodyCell text="2.1 GB" />
      </TableBodyRow>
      <TableBodyRow>
        <TableBodyCell text="flamox365" />
        <TableBodyCell text="RueDeRennes" />
        <TableBodyCell>{status('Merged', 'success')}</TableBodyCell>
        <TableBodyCell text="640 MB" />
      </TableBodyRow>
    </TableBody>
  </Table>
);
