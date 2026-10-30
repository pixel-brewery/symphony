import { DropdownButton, Menu, MenuItem, Stack } from '@pixel-brewery/mosaik-elements-react';

// A dropdown is only visible in a screenshot when it is pinned open; `absolute`
// keeps the panel inside the preview instead of floating over the viewport.
const pinnedOpen = {
  isDropDownOpen: true,
  dropDownStaysOpen: true,
  dropDownStrategy: 'absolute' as const,
};

export const BoardItemActions = () => (
  <div style={{ height: '320px', width: '200px' }}>
    <DropdownButton
      label="Actions"
      icon="settings"
      appearance="outline"
      caretVisible={false}
      dropDownPlacement="bottom-start"
      dropDownWidth="240px"
      {...pinnedOpen}
    >
      <Menu>
        <MenuItem
          label="Move forward"
          subLabel="In review"
          icon="chevronRight"
          appearance="plain"
        />
        <MenuItem label="Move backward" subLabel="Ready" icon="chevronLeft" appearance="plain" />
        <MenuItem label="Open pull request" icon="github" appearance="plain" />
        <MenuItem label="Retry delivery" icon="sync" appearance="plain" />
        <MenuItem label="Discard worktree" icon="delete" appearance="plain" variant="danger" />
      </Menu>
    </DropdownButton>
  </div>
);

export const ExecutionFilter = () => (
  <div style={{ height: '300px', width: '200px' }}>
    <DropdownButton
      label="Filter"
      icon="filter"
      appearance="plain"
      caretVisible={false}
      dropDownPlacement="bottom-start"
      dropDownWidth="200px"
      {...pinnedOpen}
    >
      <Menu>
        <MenuItem label="All executions" isChecked />
        <MenuItem label="Running only" />
        <MenuItem label="Failed only" />
        <MenuItem label="Claude" isChecked />
        <MenuItem label="Codex" />
      </Menu>
    </DropdownButton>
  </div>
);

export const Appearances = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    {(['outline', 'soft', 'solid', 'plain'] as const).map((appearance) => (
      <DropdownButton
        key={appearance}
        label={appearance}
        icon="filter"
        appearance={appearance}
        variant="primary"
        caretVisible={false}
      />
    ))}
  </Stack>
);

export const IconOnlyAndStates = () => (
  <Stack orientation="horizontal" gap="8px" wrap="wrap" verticalAlignment="center">
    <DropdownButton icon="settings" appearance="plain" caretVisible={false} />
    <DropdownButton
      label="Sort by"
      icon="board"
      appearance="outline"
      caretVisible={false}
      size="small"
    />
    <DropdownButton label="Working" appearance="outline" caretVisible={false} isBusy />
    <DropdownButton label="Unavailable" appearance="outline" caretVisible={false} disabled />
  </Stack>
);
