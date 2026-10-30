import { Menu, MenuItem, Text } from '@pixel-brewery/mosaik-elements-react';

export const LabelsAndSubLabels = () => (
  <Menu>
    <MenuItem
      label="Workspaces"
      subLabel="Open or add a separate company workspace."
      textOverflow="wrap"
    />
    <MenuItem
      label="Automation"
      subLabel="Control unattended work and delivery policies."
      textOverflow="wrap"
    />
    <MenuItem
      label="Mobile access"
      subLabel="Pair phones on the local network so approvals can happen away from the Mac."
      textOverflow="truncate"
    />
  </Menu>
);

export const WithIcons = () => (
  <Menu>
    <MenuItem label="Open repository" icon="open" />
    <MenuItem label="Create work item" icon="add" />
    <MenuItem label="Copy branch name" icon="copy" />
    <MenuItem label="Synchronise board" icon="sync" />
  </Menu>
);

export const States = () => (
  <Menu>
    <MenuItem label="Board" icon="board" isActive />
    <MenuItem label="Claude account" icon="claude" isChecked />
    <MenuItem label="Codex account" icon="openai" isFocused />
    <MenuItem label="Azure DevOps" icon="azureDevOps" disabled />
    <MenuItem label="Delete workspace" icon="delete" variant="danger" />
  </Menu>
);

export const InlineSubmenu = () => (
  <Menu>
    <MenuItem label="Workspaces" subLabel="Two workspaces configured" menuMode="inline" isExpanded>
      <MenuItem label="FLAMOX365" subLabel="FLX" />
      <MenuItem label="Symphony" subLabel="SYM" isActive />
    </MenuItem>
    <MenuItem label="Repositories" subLabel="Bindings and setup scripts" menuMode="inline">
      <MenuItem label="pixel-brewery/symphony" />
    </MenuItem>
  </Menu>
);

export const SlottedContent = () => (
  <Menu>
    <MenuItem>
      <Text slot="label" text="pixel-brewery/symphony" />
      <Text slot="subLabel" text="main · 12 open pull requests" variant="neutral" />
      <Text slot="end" text="SYM" variant="neutral" />
    </MenuItem>
    <MenuItem>
      <Text slot="label" text="flamox365/mosaik" />
      <Text slot="subLabel" text="main · 3 open pull requests" variant="neutral" />
      <Text slot="end" text="MSK" variant="neutral" />
    </MenuItem>
  </Menu>
);
