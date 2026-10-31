import {
  Badge,
  Button,
  FlowBoard,
  FlowBoardColumn,
  FlowBoardColumnItem,
  FlowBoardColumnItemGroup,
  Hint,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const frame = { height: '400px', width: '100%', display: 'block' };
const wide = { '--flow-board-column-min-width': '400px', '--flow-board-column-max-width': '420px' };
const narrow = {
  '--flow-board-column-min-width': '280px',
  '--flow-board-column-max-width': '300px',
};
const subtitleCol = { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '6px' };

const member = (key: string, title: string, ticket: string) => (
  <FlowBoardColumnItem key={key} itemKey={key} appearance="soft" ripple={false}>
    <Text slot="title" text={title} wrap />
    <div slot="subtitle" style={subtitleCol}>
      <Hint text={ticket} textOverflow="wrap" />
    </div>
  </FlowBoardColumnItem>
);

const root = (
  <FlowBoardColumnItem slot="root" itemKey="sym-402" appearance="soft" ripple={false}>
    <div slot="eyebrow">
      <Badge label="3 tickets" appearance="soft" variant="primary" size="small" />
    </div>
    <Text slot="title" text="Keep failed worktrees for diagnosis" wrap />
    <div slot="subtitle" style={subtitleCol}>
      <Hint text="Root · SYM-402 · pixel-brewery/symphony" textOverflow="wrap" />
      <Hint text="Delivered in one shared workflow" textOverflow="wrap" />
    </div>
  </FlowBoardColumnItem>
);

export const DeliveryGroup = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn style={wide} columnKey="in-delivery" appearance="soft" isExpanded>
        <Text slot="title" text="In delivery" wrap />
        <Badge slot="meta" label="1" appearance="soft" variant="primary" />
        <FlowBoardColumnItemGroup
          groupKey="grp-storage"
          rootItemKey="sym-402"
          appearance="soft"
          stacking="depth"
          maxStackDepth={3}
          draggable={false}
          reorderable={false}
        >
          {root}
          <Button slot="actions" icon="settings" appearance="plain" size="tiny" />
          {member('sym-398', 'Short TMPDIR for managed workspaces', 'SYM-398')}
          {member('sym-391', 'Reclaim space when a workspace closes', 'SYM-391')}
        </FlowBoardColumnItemGroup>
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const Stacking = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      {(['depth', 'spaced'] as const).map((stacking) => (
        <FlowBoardColumn
          key={stacking}
          style={narrow}
          columnKey={stacking}
          appearance="soft"
          isExpanded
        >
          <Text slot="title" text={`stacking=${stacking}`} wrap />
          <FlowBoardColumnItemGroup
            groupKey={`grp-${stacking}`}
            rootItemKey={`root-${stacking}`}
            appearance="soft"
            stacking={stacking}
            maxStackDepth={3}
            draggable={false}
            reorderable={false}
          >
            <FlowBoardColumnItem
              slot="root"
              itemKey={`root-${stacking}`}
              appearance="soft"
              ripple={false}
            >
              <Text slot="title" text="Keep failed worktrees for diagnosis" wrap />
              <div slot="subtitle" style={subtitleCol}>
                <Hint text="Root · SYM-402" textOverflow="wrap" />
              </div>
            </FlowBoardColumnItem>
            {member(`m1-${stacking}`, 'Short TMPDIR for managed workspaces', 'SYM-398')}
            {member(`m2-${stacking}`, 'Reclaim space when a workspace closes', 'SYM-391')}
          </FlowBoardColumnItemGroup>
        </FlowBoardColumn>
      ))}
    </FlowBoard>
  </div>
);

export const PausedGroup = () => (
  <div style={{ ...frame, height: '440px' }}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn style={wide} columnKey="review" appearance="soft" isExpanded>
        <Text slot="title" text="In review" wrap />
        <Badge slot="meta" label="2" appearance="soft" />
        <FlowBoardColumnItemGroup
          groupKey="grp-paused"
          rootItemKey="sym-455"
          appearance="soft"
          variant="warning"
          stacking="spaced"
          maxStackDepth={2}
          draggable={false}
          reorderable={false}
        >
          <FlowBoardColumnItem slot="root" itemKey="sym-455" appearance="soft" ripple={false}>
            <div slot="eyebrow">
              <Badge label="2 tickets" appearance="soft" variant="warning" size="small" />
            </div>
            <Text slot="title" text="Group deliveries that share a branch" wrap />
            <div slot="subtitle" style={subtitleCol}>
              <Hint text="Root · SYM-455 · paused" textOverflow="wrap" />
              <Hint text="Align the members to the root column to continue" textOverflow="wrap" />
            </div>
          </FlowBoardColumnItem>
          {member('sym-457', 'Dissolve a delivery group safely', 'SYM-457')}
        </FlowBoardColumnItemGroup>
        <FlowBoardColumnItem itemKey="sym-377" appearance="soft" ripple={false}>
          <Text slot="title" text="Block external browser launches in e2e mode" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="SYM-377 · pull request #470" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);
