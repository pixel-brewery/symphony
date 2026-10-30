import {
  Badge,
  Button,
  FlowBoard,
  FlowBoardColumn,
  FlowBoardColumnItem,
  Hint,
  Icon,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const frame = { height: '420px', width: '100%', display: 'block' };
const narrow = {
  '--flow-board-column-min-width': '200px',
  '--flow-board-column-max-width': '210px',
};
const subtitle = { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '6px' };

const item = (key: string, title: string, ticket: string) => (
  <FlowBoardColumnItem
    key={key}
    itemKey={key}
    appearance="soft"
    draggable={false}
    reorderable={false}
    ripple={false}
  >
    <Text slot="title" text={title} wrap />
    <div slot="subtitle" style={subtitle}>
      <Hint text={ticket} textOverflow="wrap" />
    </div>
  </FlowBoardColumnItem>
);

export const ColumnAnatomy = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn columnKey="in-delivery" appearance="soft" collapsible isExpanded>
        <Text slot="title" text="In delivery" wrap />
        <Badge slot="meta" label="3" appearance="soft" variant="primary" />
        <Button slot="actions" icon="filter" appearance="plain" size="tiny" />
        {item('sym-402', 'Keep failed worktrees for diagnosis', 'SYM-402 · pixel-brewery/symphony')}
        {item('sym-398', 'Short TMPDIR for managed workspaces', 'SYM-398 · pixel-brewery/symphony')}
        {item(
          'sym-391',
          'Reclaim space when a workspace closes',
          'SYM-391 · pixel-brewery/symphony',
        )}
        <Button slot="footer" label="Add work item" icon="add" appearance="plain" fit="width" />
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const Appearances = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      {(['plain', 'soft', 'outline', 'solid'] as const).map((appearance) => (
        <FlowBoardColumn
          key={appearance}
          style={narrow}
          columnKey={appearance}
          appearance={appearance}
          isExpanded
        >
          <Text slot="title" text={appearance} wrap />
          <Badge slot="meta" label="1" appearance="soft" />
          {item(`sym-412-${appearance}`, 'Retry a failed delivery', 'SYM-412')}
        </FlowBoardColumn>
      ))}
    </FlowBoard>
  </div>
);

export const Collapsed = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn columnKey="backlog" appearance="soft" collapsible isExpanded={false}>
        <Text slot="title" text="Backlog" wrap />
        <Badge slot="meta" label="18" appearance="soft" />
        {item('sym-455', 'Group deliveries that share a branch', 'SYM-455')}
      </FlowBoardColumn>
      <FlowBoardColumn columnKey="ready" appearance="soft" collapsible isExpanded>
        <Text slot="title" text="Ready" wrap />
        <Badge slot="meta" label="2" appearance="soft" />
        {item('sym-412', 'Retry a failed delivery without recloning', 'SYM-412')}
        {item('sym-436', 'Surface storage pressure in the workspace picker', 'SYM-436')}
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const EmptyAndDisabled = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn columnKey="blocked" appearance="soft" pinned isExpanded>
        <Text slot="title" text="Blocked" wrap />
        <Badge slot="meta" label="0" appearance="soft" />
        <Stack slot="empty" orientation="vertical" gap="small" horizontalAlignment="center">
          <Icon icon="checkCircle" size="medium" appearance="plain" variant="success" />
          <Text text="Nothing is blocked right now." alignment="center" wrap />
        </Stack>
      </FlowBoardColumn>
      <FlowBoardColumn columnKey="done" appearance="soft" disabled isExpanded>
        <Text slot="title" text="Done (read-only)" wrap />
        <Badge slot="meta" label="1" appearance="soft" />
        {item('sym-377', 'Block external browser launches in e2e mode', 'SYM-377')}
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);
