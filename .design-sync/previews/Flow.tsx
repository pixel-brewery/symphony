import {
  Badge,
  Flow,
  FlowControls,
  FlowEdge,
  FlowMinimap,
  FlowNode,
  Hint,
  Icon,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// Symphony lays these graphs out with Mosaik's Dagre engine; the previews place
// the nodes by hand so the bundle does not carry a layout library.
const frame = { display: 'block', width: '100%', height: '420px' };

const Stage = ({
  icon,
  label,
  hint,
  visits,
}: {
  icon: string;
  label: string;
  hint: string;
  visits?: string;
}) => (
  <Stack orientation="horizontal" gap="small" verticalAlignment="center">
    <Icon icon={icon} size="small" />
    <Stack orientation="vertical" gap="tiny">
      <Text text={label} wrap />
      <Hint text={hint} />
    </Stack>
    {visits ? <Badge label={visits} appearance="soft" variant="primary" size="small" /> : null}
  </Stack>
);

export const ProcessGraph = () => (
  <Flow
    label="Process graph"
    direction="top-to-bottom"
    edgeRouting="orthogonal"
    edgeMarkerEnd="arrow"
    selectionMode="single"
    selectedKey="stage:implementation"
    grid="dots"
    fitOnLoad
    fitPadding={24}
    maxZoom={1}
    style={frame}
  >
    <FlowNode nodeKey="stage:analysis" x={40} y={0} label="Analysis" variant="success">
      <Stage icon="bot" label="Analysis" hint="analyst → planner" />
    </FlowNode>
    <FlowNode
      nodeKey="stage:implementation"
      x={40}
      y={130}
      label="Implementation"
      variant="primary"
    >
      <Stage icon="bot" label="Implementation" hint="implementer" visits="2×" />
    </FlowNode>
    <FlowNode nodeKey="stage:review" x={40} y={260} label="Review" variant="neutral">
      <Stage icon="person" label="Review" hint="Human gate" />
    </FlowNode>
    <FlowNode nodeKey="stage:done" x={40} y={390} label="Done" variant="neutral">
      <Stage icon="checkmark" label="Done" hint="Terminal" />
    </FlowNode>
    <FlowEdge
      edgeKey="t:1"
      source="stage:analysis"
      target="stage:implementation"
      sourceSide="bottom"
      targetSide="top"
      offset={32}
    >
      <Badge
        slot="label"
        label="planner · ready"
        appearance="soft"
        variant="primary"
        size="small"
      />
    </FlowEdge>
    <FlowEdge
      edgeKey="t:2"
      source="stage:implementation"
      target="stage:review"
      sourceSide="bottom"
      targetSide="top"
      offset={32}
    >
      <Badge
        slot="label"
        label="implementer · done ×2"
        appearance="soft"
        variant="primary"
        size="small"
      />
    </FlowEdge>
    <FlowEdge
      edgeKey="t:3"
      source="stage:review"
      target="stage:implementation"
      sourceSide="left"
      targetSide="left"
      offset={64}
      labelPosition={0.5}
    >
      <Badge
        slot="label"
        label="changes-requested"
        appearance="soft"
        variant="neutral"
        size="small"
      />
    </FlowEdge>
    <FlowEdge
      edgeKey="t:4"
      source="stage:review"
      target="stage:done"
      sourceSide="bottom"
      targetSide="top"
      offset={32}
    >
      <Badge slot="label" label="approve" appearance="soft" variant="neutral" size="small" />
    </FlowEdge>
    <FlowMinimap slot="minimap" />
    <FlowControls slot="controls" />
  </Flow>
);

const Job = ({ icon, name, hint }: { icon: string; name: string; hint: string }) => (
  <Stack orientation="vertical" gap="tiny">
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Icon icon={icon} size="small" />
      <Text text={name} />
    </Stack>
    <Hint text={hint} />
  </Stack>
);

export const CiJobGraph = () => (
  <Flow
    label="Workflow jobs"
    direction="left-to-right"
    edgeRouting="bezier"
    fitOnLoad
    fitPadding={24}
    maxZoom={1}
    style={{ ...frame, height: '320px' }}
  >
    <FlowNode nodeKey="job:lint" x={0} y={0} label="lint · Succeeded" variant="success">
      <Job icon="checkmarkCircle" name="lint" hint="42s" />
    </FlowNode>
    <FlowNode nodeKey="job:typecheck" x={0} y={130} label="typecheck · Succeeded" variant="success">
      <Job icon="checkmarkCircle" name="typecheck" hint="1m 08s" />
    </FlowNode>
    <FlowNode nodeKey="job:test" x={340} y={65} label="test · Failed" variant="danger">
      <Job icon="errorCircle" name="test" hint="3m 51s" />
    </FlowNode>
    <FlowNode
      nodeKey="job:e2e"
      x={680}
      y={0}
      label="e2e · Waiting for pending jobs"
      variant="neutral"
    >
      <Job icon="executionOutline" name="e2e" hint="Waiting for pending jobs" />
    </FlowNode>
    <FlowNode nodeKey="job:release" x={680} y={130} label="release · Unresolved" variant="warning">
      <Job icon="warning" name="release" hint="Dependency unresolved" />
    </FlowNode>
    <FlowEdge edgeKey="d:1" source="job:lint" target="job:test" />
    <FlowEdge edgeKey="d:2" source="job:typecheck" target="job:test" />
    <FlowEdge edgeKey="d:3" source="job:test" target="job:e2e" />
    <FlowEdge edgeKey="d:4" source="job:test" target="job:release" />
    <FlowMinimap slot="minimap" />
    <FlowControls slot="controls" />
  </Flow>
);
