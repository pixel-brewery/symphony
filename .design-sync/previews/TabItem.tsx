import { Stack, Tab, TabItem, Text } from '@pixel-brewery/mosaik-elements-react';

export const SelectedItemShowsItsPanel = () => (
  <Tab hasIndicator>
    <TabItem label="Workspace" isSelected>
      <Stack orientation="vertical" gap="small">
        <Text text="symphony · /home/example/github/symphony" wrap />
        <Text text="Only the selected item renders its panel." variant="neutral" wrap />
      </Stack>
    </TabItem>
    <TabItem label="Repositories">
      <Text text="pixel-brewery/symphony — default branch main." wrap />
    </TabItem>
    <TabItem label="Agents">
      <Text text="Claude (primary) · Codex (backup)." wrap />
    </TabItem>
  </Tab>
);

export const WithIcons = () => (
  <Tab hasIndicator>
    <TabItem label="Board" icon="board" isSelected>
      <Text text="18 work items, 3 of them qualified." wrap />
    </TabItem>
    <TabItem label="Deliveries" icon="branch">
      <Text text="2 claims running against the managed worktrees." wrap />
    </TabItem>
    <TabItem label="Skills" icon="skills">
      <Text text="7 portable skills resolved for this workspace." wrap />
    </TabItem>
  </Tab>
);

export const IconAfterLabel = () => (
  <Tab hasIndicator>
    <TabItem label="Execution log" icon="executionOutline" iconPosition="after" isSelected>
      <Text text="Streaming stdout from the delivery container." wrap />
    </TabItem>
    <TabItem label="Artifacts" icon="folderOpen" iconPosition="after">
      <Text text="Coverage report and the packaged skill archive." wrap />
    </TabItem>
  </Tab>
);

export const DisabledItem = () => (
  <Tab hasIndicator>
    <TabItem label="Summary" isSelected>
      <Text text="A disabled item stays visible in the strip but cannot be opened." wrap />
    </TabItem>
    <TabItem label="Pull request" disabled>
      <Text text="No pull request has been opened for this claim yet." wrap />
    </TabItem>
    <TabItem label="Merge queue" disabled>
      <Text text="Unavailable until the pull request exists." wrap />
    </TabItem>
  </Tab>
);
