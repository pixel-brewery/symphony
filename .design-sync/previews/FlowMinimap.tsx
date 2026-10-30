import { Flow, FlowEdge, FlowMinimap, FlowNode } from '@pixel-brewery/mosaik-elements-react';

// The mini-map sits in the flow's minimap slot and mirrors every node in its
// variant colour; on narrow views it moves above the graph.
export const InAJobGraph = () => (
  <Flow
    label="Workflow jobs"
    direction="left-to-right"
    edgeRouting="bezier"
    fitOnLoad
    fitPadding={24}
    maxZoom={1}
    minimapPosition="top-end"
    style={{ display: 'block', width: '100%', height: '320px' }}
  >
    <FlowNode nodeKey="lint" x={0} y={0} label="lint · Succeeded" variant="success" />
    <FlowNode nodeKey="typecheck" x={0} y={130} label="typecheck · Succeeded" variant="success" />
    <FlowNode nodeKey="test" x={340} y={65} label="test · Failed" variant="danger" />
    <FlowNode nodeKey="e2e" x={680} y={0} label="e2e · Waiting" variant="neutral" />
    <FlowNode nodeKey="release" x={680} y={130} label="release · Unresolved" variant="warning" />
    <FlowEdge edgeKey="1" source="lint" target="test" />
    <FlowEdge edgeKey="2" source="typecheck" target="test" />
    <FlowEdge edgeKey="3" source="test" target="e2e" />
    <FlowEdge edgeKey="4" source="test" target="release" />
    <FlowMinimap slot="minimap" label="Job overview" />
  </Flow>
);
