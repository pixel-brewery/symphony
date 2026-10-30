import {
  Badge,
  Chip,
  FlowBoard,
  FlowBoardColumn,
  FlowBoardColumnItem,
  Hint,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const frame = { height: '440px', width: '100%', display: 'block' };
// Boards are built for the full application width; the documented width custom
// properties keep three columns of a real board visible in a narrow frame.
const column = {
  '--flow-board-column-min-width': '265px',
  '--flow-board-column-max-width': '280px',
};
const subtitle = { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '6px' };

const item = (key: string, title: string, ticket: string, branch?: string) => (
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
      {branch ? <Chip label={branch} icon="branch" size="tiny" appearance="soft" /> : null}
    </div>
  </FlowBoardColumnItem>
);

export const DeliveryBoard = () => (
  <div style={frame}>
    <FlowBoard
      displayMode="tasks"
      orientation="horizontal"
      selectionMode="multiple"
      dragdrop={false}
      gap={0}
    >
      <FlowBoardColumn
        style={column}
        columnKey="qualified"
        appearance="plain"
        collapsible
        isExpanded
      >
        <Text slot="title" text="Qualified" wrap />
        <Badge slot="meta" label="2" appearance="soft" />
        {item(
          'sym-431',
          'Normalise case-sensitive preview paths',
          'SYM-431 · pixel-brewery/symphony',
        )}
        {item(
          'sym-436',
          'Surface storage pressure in the workspace picker',
          'SYM-436 · pixel-brewery/symphony',
        )}
      </FlowBoardColumn>
      <FlowBoardColumn
        style={column}
        columnKey="in-delivery"
        appearance="plain"
        collapsible
        isExpanded
      >
        <Text slot="title" text="In delivery" wrap />
        <Badge slot="meta" label="2" appearance="soft" variant="primary" />
        {item(
          'sym-402',
          'Keep failed worktrees for diagnosis',
          'SYM-402 · pixel-brewery/symphony',
          'codex/keep-failed-worktrees',
        )}
        {item('sym-398', 'Short TMPDIR for managed workspaces', 'SYM-398 · pixel-brewery/symphony')}
      </FlowBoardColumn>
      <FlowBoardColumn style={column} columnKey="review" appearance="plain" collapsible isExpanded>
        <Text slot="title" text="In review" wrap />
        <Badge slot="meta" label="1" appearance="soft" />
        {item(
          'sym-377',
          'Block external browser launches in e2e mode',
          'SYM-377 · pixel-brewery/symphony',
          'codex/no-external-browser',
        )}
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const PipelineDisplayMode = () => (
  <div style={frame}>
    <FlowBoard displayMode="pipeline" orientation="horizontal" dragdrop={false} gap="small">
      <FlowBoardColumn style={column} columnKey="analysis" appearance="soft" isExpanded>
        <Text slot="title" text="Analysis" wrap />
        <Badge slot="meta" label="2" appearance="soft" />
        {item('sym-431', 'Normalise case-sensitive preview paths', 'SYM-431')}
        {item('sym-436', 'Surface storage pressure', 'SYM-436')}
      </FlowBoardColumn>
      <FlowBoardColumn style={column} columnKey="implementation" appearance="soft" isExpanded>
        <Text slot="title" text="Implementation" wrap />
        <Badge slot="meta" label="1" appearance="soft" variant="primary" />
        {item(
          'sym-402',
          'Keep failed worktrees for diagnosis',
          'SYM-402',
          'codex/keep-failed-worktrees',
        )}
      </FlowBoardColumn>
      <FlowBoardColumn style={column} columnKey="verification" appearance="soft" isExpanded>
        <Text slot="title" text="Verification" wrap />
        <Badge slot="meta" label="1" appearance="soft" />
        {item('sym-377', 'Block external browser launches', 'SYM-377', 'codex/no-external-browser')}
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const VerticalOrientation = () => (
  <div style={{ height: '440px', width: '420px' }}>
    <FlowBoard orientation="vertical" displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn columnKey="ready" appearance="soft" isExpanded>
        <Text slot="title" text="Ready" wrap />
        <Badge slot="meta" label="1" appearance="soft" />
        {item('sym-412', 'Retry a failed delivery without recloning', 'SYM-412')}
      </FlowBoardColumn>
      <FlowBoardColumn columnKey="in-delivery" appearance="soft" isExpanded>
        <Text slot="title" text="In delivery" wrap />
        <Badge slot="meta" label="1" appearance="soft" variant="primary" />
        {item(
          'sym-402',
          'Keep failed worktrees for diagnosis',
          'SYM-402',
          'codex/keep-failed-worktrees',
        )}
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);
