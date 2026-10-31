import {
  Flow,
  FlowEdge,
  FlowNode,
  Hint,
  Icon,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const frame = { display: 'block', width: '100%', height: '220px' };

const Stage = ({ icon, label, hint }: { icon: string; label: string; hint: string }) => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center">
    <Icon icon={icon} size="small" />
    <Stack orientation="vertical" gap="tiny">
      <Text text={label} wrap />
      <Hint text={hint} />
    </Stack>
  </Stack>
);

// Symphony maps a stage's state onto the node variant: visited → success,
// current → primary, unreachable → warning, everything else neutral.
export const StageStates = () => (
  <Flow
    label="Stage states"
    edgeMarkerEnd="arrow"
    fitOnLoad
    fitPadding={16}
    maxZoom={1}
    style={frame}
  >
    <FlowNode nodeKey="visited" x={0} y={0} label="Analysis" variant="success">
      <Stage icon="bot" label="Analysis" hint="Visited" />
    </FlowNode>
    <FlowNode nodeKey="current" x={340} y={0} label="Implementation" variant="primary">
      <Stage icon="bot" label="Implementation" hint="Current" />
    </FlowNode>
    <FlowNode nodeKey="pending" x={680} y={0} label="Review" variant="neutral">
      <Stage icon="person" label="Review" hint="Human gate" />
    </FlowNode>
    <FlowNode nodeKey="unreachable" x={1020} y={0} label="Release" variant="warning">
      <Stage icon="warning" label="Release" hint="Unreachable" />
    </FlowNode>
    <FlowEdge edgeKey="a" source="visited" target="current" />
    <FlowEdge edgeKey="b" source="current" target="pending" />
    <FlowEdge edgeKey="c" source="pending" target="unreachable" />
  </Flow>
);

export const Shapes = () => (
  <Flow label="Node shapes" fitOnLoad fitPadding={16} maxZoom={1} style={frame}>
    <FlowNode
      nodeKey="rectangle"
      x={0}
      y={20}
      label="Rectangle"
      shape="rectangle"
      variant="neutral"
    />
    <FlowNode nodeKey="pill" x={340} y={20} label="Pill" shape="pill" variant="neutral" />
    <FlowNode nodeKey="circle" x={680} y={0} label="Start" shape="circle" variant="primary" />
    <FlowNode nodeKey="diamond" x={880} y={0} label="Gate" shape="diamond" variant="warning" />
  </Flow>
);
