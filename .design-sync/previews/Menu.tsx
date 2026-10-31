import { Menu, MenuItem } from '@pixel-brewery/mosaik-elements-react';

export const SettingsNavigation = () => (
  <Menu>
    <MenuItem
      label="Workspaces"
      subLabel="Open or add a separate company workspace."
      textOverflow="wrap"
      menuMode="inline"
      isActive
      isExpanded
    >
      <MenuItem label="FLAMOX365" subLabel="FLX" textOverflow="wrap" isActive />
      <MenuItem label="Symphony" subLabel="SYM" textOverflow="wrap" />
    </MenuItem>
    <MenuItem
      label="Automation"
      subLabel="Control unattended work and delivery policies."
      textOverflow="wrap"
    />
    <MenuItem
      label="Skills"
      subLabel="Refine how each built-in process role works."
      textOverflow="wrap"
    />
    <MenuItem
      label="System"
      subLabel="Manage tools, storage, updates, and skill imports."
      textOverflow="wrap"
    />
    <MenuItem label="Appearance" subLabel="Choose how Symphony looks." textOverflow="wrap" />
  </Menu>
);

export const ContextActions = () => (
  <Menu>
    <MenuItem
      label="Move forward"
      subLabel="In review"
      icon="chevronRight"
      appearance="plain"
      textOverflow="wrap"
    />
    <MenuItem
      label="Move backward"
      subLabel="Ready"
      icon="chevronLeft"
      appearance="plain"
      textOverflow="wrap"
    />
    <MenuItem label="Open pull request" icon="github" appearance="plain" />
    <MenuItem label="Retry delivery" icon="sync" appearance="plain" disabled />
    <MenuItem label="Discard worktree" icon="delete" appearance="plain" variant="danger" />
  </Menu>
);

export const CheckableFilters = () => (
  <Menu>
    <MenuItem label="All executions" isChecked />
    <MenuItem label="Running only" />
    <MenuItem label="Failed only" />
    <MenuItem label="Claude" isChecked />
    <MenuItem label="Codex" />
  </Menu>
);

export const Inset = () => (
  <Menu inset="all">
    <MenuItem label="Board" icon="board" isActive />
    <MenuItem label="Deliveries" icon="flow" />
    <MenuItem label="Executions" icon="executionOutline" />
    <MenuItem label="Settings" icon="settings" />
  </Menu>
);
