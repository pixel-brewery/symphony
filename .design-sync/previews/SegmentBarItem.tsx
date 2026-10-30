import { Dot, SegmentBar, SegmentBarItem, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

const legend = {
  display: 'flex',
  width: '100%',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '4px 16px',
  lineHeight: 1.4,
};
const entry = { display: 'inline-flex', alignItems: 'center', gap: '6px' };

export const AllocationSegments = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Managed storage by category" wrap />
    <SegmentBar min={0} max={40} thickness="12px" segmentGap={2}>
      <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
      <SegmentBarItem value={6.2} variant="info" label="Executions" />
      <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
      <SegmentBarItem value={1.2} variant="highlight" label="Logs" />
      <div slot="hint" style={legend}>
        <span style={entry}>
          <Dot size="small" fill="full" variant="primary" />
          <Text text="Workspaces" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="info" />
          <Text text="Executions" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="secondary" />
          <Text text="Runner images" readonly />
        </span>
        <span style={entry}>
          <Dot size="small" fill="full" variant="highlight" />
          <Text text="Logs" readonly />
        </span>
      </div>
    </SegmentBar>
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="large">
    {(['primary', 'info', 'secondary', 'highlight', 'warning', 'danger'] as const).map(
      (variant) => (
        <Stack key={variant} orientation="vertical" gap="small">
          <Text text={variant} variant="neutral" wrap />
          <SegmentBar min={0} max={40} thickness="10px" segmentGap={2}>
            <SegmentBarItem value={26} variant={variant} label={variant} />
          </SegmentBar>
        </Stack>
      ),
    )}
  </Stack>
);

export const ClampedFill = () => (
  <Stack orientation="vertical" gap="large">
    <Stack orientation="vertical" gap="small">
      <Text text="Measured allocation — the fill follows the sum of the items" wrap />
      <SegmentBar min={0} max={40} thickness="12px" segmentGap={2}>
        <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
        <SegmentBarItem value={6.2} variant="info" label="Executions" />
        <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
      </SegmentBar>
    </Stack>
    <Stack orientation="vertical" gap="small">
      <Text text="Reclaim preview — value cuts the fill at 16 GB" wrap />
      <SegmentBar min={0} max={40} value={16} thickness="12px" segmentGap={2}>
        <SegmentBarItem value={12.4} variant="primary" label="Workspaces" />
        <SegmentBarItem value={6.2} variant="info" label="Executions" />
        <SegmentBarItem value={5.1} variant="secondary" label="Runner images" />
      </SegmentBar>
    </Stack>
  </Stack>
);
