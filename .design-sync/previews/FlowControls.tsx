import { Flow, FlowControls, FlowEdge, FlowNode } from '@pixel-brewery/mosaik-elements-react';

const frame = { display: 'block', width: '100%', height: '260px' };

const Graph = () => (
  <>
    <FlowNode nodeKey="analysis" x={0} y={0} label="Analysis" variant="success" />
    <FlowNode nodeKey="implementation" x={340} y={0} label="Implementation" variant="primary" />
    <FlowNode nodeKey="review" x={680} y={0} label="Review" variant="neutral" />
    <FlowEdge edgeKey="1" source="analysis" target="implementation" />
    <FlowEdge edgeKey="2" source="implementation" target="review" />
  </>
);

// Zoom out, zoom in and fit, in the flow's controls slot (bottom-end by default).
export const Default = () => (
  <Flow
    label="Process graph"
    edgeMarkerEnd="arrow"
    fitOnLoad
    fitPadding={24}
    maxZoom={1}
    style={frame}
  >
    <Graph />
    <FlowControls slot="controls" />
  </Flow>
);

export const WithZoomLevel = () => (
  <Flow
    label="Process graph"
    edgeMarkerEnd="arrow"
    fitOnLoad
    fitPadding={24}
    maxZoom={1}
    controlsPosition="top-end"
    style={frame}
  >
    <Graph />
    <FlowControls slot="controls" showZoom />
  </Flow>
);
