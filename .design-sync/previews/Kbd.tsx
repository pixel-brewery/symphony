import { Kbd, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

const row = {
  display: 'grid',
  gridTemplateColumns: '170px minmax(0, 1fr)',
  alignItems: 'center',
  justifyItems: 'start',
  gap: '12px',
};

export const WorkspaceShortcuts = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Symphony shortcuts" wrap />
    <div style={row}>
      <Kbd value={['Meta', 'K']} />
      <Text text="Open the global workspace search" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Meta', 'Shift', 'B']} />
      <Text text="Jump to the board" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Meta', 'Enter']} />
      <Text text="Start the delivery for the selected work item" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Meta', 'Alt', 'I']} />
      <Text text="Toggle the developer tools" wrap />
    </div>
  </Stack>
);

export const ModifierSymbols = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Modifier names render as their macOS symbols" wrap />
    <div style={row}>
      <Kbd value={['Meta']} />
      <Text text="Meta → ⌘" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Shift']} />
      <Text text="Shift → ⇧" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Control']} />
      <Text text="Control → ⌃" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Alt']} />
      <Text text="Alt → ⌥" wrap />
    </div>
    <div style={row}>
      <Kbd value={['Escape']} />
      <Text text="Everything else is printed as written" wrap />
    </div>
  </Stack>
);

export const ArcadeControls = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Pinball controls, exactly as the arcade view lists them" wrap />
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Kbd value={['←']} />
      <Kbd value={['→']} />
      <Text text="Left and right flipper" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Kbd value={['Space']} />
      <Kbd value={['↓']} />
      <Text text="Hold to charge the plunger, release to launch" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Kbd value={['A']} />
      <Kbd value={['D']} />
      <Text text="Nudge the table left or right" wrap />
    </Stack>
    <Stack orientation="horizontal" gap="small" verticalAlignment="center">
      <Kbd value={['P']} />
      <Text text="Pause or resume the game" wrap />
    </Stack>
  </Stack>
);
