import { Badge, Flow, FlowEdge, FlowNode } from '@pixel-brewery/mosaik-elements-react';

const frame = { display: 'block', width: '100%', height: '260px' };

export const Routing = () => (
  <Flow
    label="Edge routing"
    direction="left-to-right"
    edgeMarkerEnd="arrow"
    fitOnLoad
    fitPadding={16}
    maxZoom={1}
    style={frame}
  >
    <FlowNode nodeKey="a1" x={0} y={0} label="lint" variant="neutral" />
    <FlowNode nodeKey="a2" x={340} y={90} label="straight" variant="neutral" />
    <FlowNode nodeKey="b1" x={0} y={220} label="typecheck" variant="neutral" />
    <FlowNode nodeKey="b2" x={340} y={310} label="bezier" variant="neutral" />
    <FlowNode nodeKey="c1" x={720} y={0} label="test" variant="neutral" />
    <FlowNode nodeKey="c2" x={1060} y={160} label="orthogonal" variant="neutral" />
    <FlowEdge edgeKey="s" source="a1" target="a2" routing="straight" />
    <FlowEdge edgeKey="b" source="b1" target="b2" routing="bezier" />
    <FlowEdge edgeKey="o" source="c1" target="c2" routing="orthogonal" cornerRadius={8} />
  </Flow>
);

// A taken transition carries a primary label, an untaken one a neutral label;
// a backward transition leaves and enters on the left with a wider offset.
export const LabelledTransitions = () => (
  <Flow
    label="Transitions"
    direction="top-to-bottom"
    edgeRouting="orthogonal"
    edgeMarkerEnd="arrow"
    fitOnLoad
    fitPadding={16}
    maxZoom={1}
    style={frame}
  >
    <FlowNode nodeKey="impl" x={120} y={0} label="Implementation" variant="primary" />
    <FlowNode nodeKey="review" x={120} y={140} label="Review" variant="neutral" />
    <FlowEdge
      edgeKey="forward"
      source="impl"
      target="review"
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
      edgeKey="back"
      source="review"
      target="impl"
      sourceSide="left"
      targetSide="left"
      offset={64}
    >
      <Badge
        slot="label"
        label="changes-requested"
        appearance="soft"
        variant="neutral"
        size="small"
      />
    </FlowEdge>
  </Flow>
);
