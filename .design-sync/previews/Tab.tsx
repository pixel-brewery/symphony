import { Button, Stack, Tab, TabItem, Text } from '@pixel-brewery/mosaik-elements-react';

export const WorkItemTabs = () => (
  <Tab hasIndicator>
    <TabItem label="Overview" isSelected>
      <Stack orientation="vertical" gap="small">
        <Text text="SYM-418 · Shorten managed workspace socket paths" wrap />
        <Text
          text="Claim branch symphony/sym-418 · Delivery finished 12 minutes ago"
          variant="neutral"
          wrap
        />
      </Stack>
    </TabItem>
    <TabItem label="Executions">
      <Text text="4 runs recorded, last one by the implementation role." wrap />
    </TabItem>
    <TabItem label="Pull requests">
      <Text text="#2184 Shorten managed workspace socket paths — open, checks green." wrap />
    </TabItem>
  </Tab>
);

export const WithHeaderAction = () => (
  <Tab hasIndicator>
    <TabItem label="Instructions" icon="skills" isSelected>
      <Text text="The review role reads the diff and never edits the worktree." wrap />
    </TabItem>
    <TabItem label="Repositories" icon="folder">
      <Text text="Bound to pixel-brewery/symphony and RueDeRennes/mosaik." wrap />
    </TabItem>
    <Button slot="end" label="Edit skill" icon="edit" appearance="plain" variant="primary" />
  </Tab>
);

export const Alignments = () => (
  <Stack orientation="vertical" gap="medium">
    {(['start', 'center', 'stretch'] as const).map((alignment) => (
      <Tab key={alignment} alignment={alignment} hasIndicator>
        <TabItem label="Queued" isSelected>
          <Text text={`Board columns, ${alignment} aligned strip.`} wrap />
        </TabItem>
        <TabItem label="Running">
          <Text text="2 executions in flight." wrap />
        </TabItem>
        <TabItem label="Review">
          <Text text="1 pull request waiting." wrap />
        </TabItem>
      </Tab>
    ))}
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="medium">
    {(['primary', 'success', 'warning'] as const).map((variant) => (
      <Tab key={variant} appearance="soft" variant={variant} hasIndicator>
        <TabItem label="Claude" isSelected>
          <Text text={`Connected account, ${variant} variant.`} wrap />
        </TabItem>
        <TabItem label="Codex">
          <Text text="Out of quota until 18:40." wrap />
        </TabItem>
      </Tab>
    ))}
  </Stack>
);

export const BottomPlacement = () => (
  <Tab placement="bottom" hasIndicator>
    <TabItem label="Diff" isSelected>
      <Text text="12 files changed across apps/renderer and libs/frontend." wrap />
    </TabItem>
    <TabItem label="Checks">
      <Text text="build · lint · e2e — all green on the self-hosted runner." wrap />
    </TabItem>
    <TabItem label="Conversation">
      <Text text="3 review comments, none blocking." wrap />
    </TabItem>
  </Tab>
);
