import { Button, EmptyState, Stack } from '@pixel-brewery/mosaik-elements-react';

export const NothingRecorded = () => (
  <EmptyState
    icon="executionOutline"
    header="Nothing recorded yet"
    content="Runs appear here as soon as the first delivery starts."
  />
);

export const NoRolesLoaded = () => (
  <EmptyState
    icon="skills"
    header="No roles loaded"
    content="Add a skill to the workspace to give Symphony something to run."
  />
);

export const WithAction = () => (
  <EmptyState
    icon="board"
    header="No work items"
    content="Create the first item to fill this board."
  >
    <Stack orientation="horizontal" gap="small" horizontalAlignment="center">
      <Button label="Create item" variant="primary" appearance="solid" icon="add" />
    </Stack>
  </EmptyState>
);
