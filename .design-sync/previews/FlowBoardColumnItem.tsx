import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Chip,
  FlowBoard,
  FlowBoardColumn,
  FlowBoardColumnItem,
  Hint,
  Icon,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const frame = { height: '420px', width: '100%', display: 'block' };
const wide = { '--flow-board-column-min-width': '420px', '--flow-board-column-max-width': '440px' };
const titleRow = { display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: '8px' };
const subtitleCol = { display: 'flex', minWidth: 0, flexDirection: 'column', gap: '6px' };

export const WorkItemCard = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" selectionMode="multiple" dragdrop={false} gap="small">
      <FlowBoardColumn style={wide} columnKey="in-delivery" appearance="soft" isExpanded>
        <Text slot="title" text="In delivery" wrap />
        <Badge slot="meta" label="1" appearance="soft" variant="primary" />
        <FlowBoardColumnItem
          itemKey="sym-402"
          appearance="soft"
          draggable={false}
          reorderable={false}
          ripple={false}
        >
          <div slot="eyebrow">
            <Badge label="3 tickets" appearance="soft" variant="primary" size="small" />
          </div>
          <div slot="title" style={titleRow}>
            <Icon icon="checkCircle" size="small" appearance="plain" variant="success" />
            <Text text="Keep failed worktrees for diagnosis" wrap />
          </div>
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="WS-7 · symphony-main" textOverflow="wrap" />
            <Hint text="SYM-402 · pixel-brewery/symphony" textOverflow="wrap" />
            <Chip label="codex/keep-failed-worktrees" icon="branch" size="tiny" appearance="soft" />
          </div>
          <Text slot="meta" text="PR #482" variant="neutral" />
          <Button slot="actions" icon="open" appearance="plain" size="tiny" />
          <div slot="footer">
            <AvatarGroup size="tiny" appearance="soft" variant="primary" maxLength={3}>
              <Avatar text="Andre Wehlert" />
              <Avatar text="Mira Osei" />
              <Avatar text="Jonas Bleeker" />
            </AvatarGroup>
          </div>
        </FlowBoardColumnItem>
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const States = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" selectionMode="multiple" dragdrop={false} gap="small">
      <FlowBoardColumn style={wide} columnKey="ready" appearance="soft" isExpanded>
        <Text slot="title" text="Ready" wrap />
        <Badge slot="meta" label="4" appearance="soft" />
        <FlowBoardColumnItem itemKey="sym-412" appearance="soft" pinned ripple={false}>
          <Text slot="title" text="Retry a failed delivery without recloning" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="Pinned — execution running" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="sym-436" appearance="soft" isSelected ripple={false}>
          <Text slot="title" text="Surface storage pressure in the workspace picker" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="Selected for a bulk move" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="sym-431" appearance="soft" isFocused ripple={false}>
          <Text slot="title" text="Normalise case-sensitive preview paths" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="Focused by keyboard navigation" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="sym-455" appearance="soft" disabled ripple={false}>
          <Text slot="title" text="Group deliveries that share a branch" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="Locked while its delivery group synchronises" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);

export const Variants = () => (
  <div style={frame}>
    <FlowBoard displayMode="tasks" dragdrop={false} gap="small">
      <FlowBoardColumn style={wide} columnKey="variants" appearance="soft" isExpanded>
        <Text slot="title" text="Health" wrap />
        <FlowBoardColumnItem itemKey="healthy" appearance="soft" variant="success" ripple={false}>
          <Text slot="title" text="All checks passed" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="SYM-377 · pull request #470 mergeable" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="attention" appearance="soft" variant="warning" ripple={false}>
          <Text slot="title" text="Delivery group needs attention" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="SYM-455 · paused, members out of sync" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="failed" appearance="soft" variant="danger" ripple={false}>
          <Text slot="title" text="Analysis failed" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="SYM-431 · read the cause in the execution log" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
        <FlowBoardColumnItem itemKey="queued" appearance="soft" variant="info" ripple={false}>
          <Text slot="title" text="Queued behind two runs" wrap />
          <div slot="subtitle" style={subtitleCol}>
            <Hint text="SYM-436 · waiting for a free workspace" textOverflow="wrap" />
          </div>
        </FlowBoardColumnItem>
      </FlowBoardColumn>
    </FlowBoard>
  </div>
);
