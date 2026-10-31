import { Dot, SegmentBar, SegmentBarItem, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

// mosaik-segment-bar sets line-height:0 on its host, and slotted content
// inherits it — the legend needs an explicit line-height to be visible.
const legend = {
  display: 'flex',
  width: '100%',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px 16px',
  lineHeight: 1.4,
};
const entry = { display: 'inline-flex', alignItems: 'center', gap: '6px' };

export const StorageBreakdown = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="24.9 GB of 40 GB · comfortable" wrap />
    <SegmentBar min={0} max={40} thickness="10px" segmentGap={2}>
      <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
      <SegmentBarItem value={6.2} variant="info" label="Executions" />
      <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
      <SegmentBarItem value={1.2} variant="highlight" label="Logs" />
      <div slot="hint" style={legend}>
        <span style={entry}>
          <Dot size="small" fill="full" variant="primary" />
          <Text text="Workspaces · 12.4 GB" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="info" />
          <Text text="Executions · 6.2 GB" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="secondary" />
          <Text text="Runner images · 5.1 GB" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="highlight" />
          <Text text="Logs · 1.2 GB" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="empty" variant="tertiary" />
          <Text text="Available · 15.1 GB" readonly />
        </span>
      </div>
    </SegmentBar>
  </Stack>
);

export const PressureLevels = () => (
  <Stack orientation="vertical" gap="large">
    <Stack orientation="vertical" gap="small">
      <Text text="WS-3 · comfortable" wrap />
      <SegmentBar min={0} max={40} thickness="10px" segmentGap={2}>
        <SegmentBarItem value={6.4} variant="primary" label="Workspaces" />
        <SegmentBarItem value={2.1} variant="info" label="Executions" />
      </SegmentBar>
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="WS-7 · approaching the limit" wrap />
      <SegmentBar min={0} max={40} thickness="10px" segmentGap={2}>
        <SegmentBarItem value={22.8} variant="primary" label="Workspaces" />
        <SegmentBarItem value={9.4} variant="warning" label="Runner images" />
      </SegmentBar>
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="WS-9 · over the write limit" wrap />
      <SegmentBar min={0} max={40} thickness="10px" segmentGap={2}>
        <SegmentBarItem value={28.2} variant="primary" label="Workspaces" />
        <SegmentBarItem value={11.5} variant="danger" label="Unreclaimed worktrees" />
      </SegmentBar>
    </Stack>
  </Stack>
);

export const Thickness = () => (
  <Stack orientation="vertical" gap="large">
    {(['4px', '10px', '20px'] as const).map((thickness) => (
      <SegmentBar key={thickness} min={0} max={40} thickness={thickness} segmentGap={2}>
        <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
        <SegmentBarItem value={6.2} variant="info" label="Executions" />
        <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
      </SegmentBar>
    ))}
  </Stack>
);

export const Vertical = () => (
  <div style={{ height: '260px', display: 'flex', alignItems: 'stretch', gap: '16px' }}>
    <SegmentBar orientation="vertical" min={0} max={40} thickness="12px" segmentGap={2}>
      <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
      <SegmentBarItem value={6.2} variant="info" label="Executions" />
      <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
    </SegmentBar>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: '2px',
        paddingBottom: '2px',
      }}
    >
      <Text text="40 GB limit" variant="neutral" wrap />
      <Text text="23.7 GB allocated across three categories" wrap />
      <Text text="0 GB" variant="neutral" wrap />
    </div>
  </div>
);
