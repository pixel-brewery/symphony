import {
  Avatar,
  Chip,
  EmptyState,
  Icon,
  List,
  ListItem,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const WorkflowList = () => (
  <List selectionMode="single" value="ci">
    <ListItem value="ci" isSelected ripple={false}>
      <Text text="CI" wrap />
      <Icon slot="suffix" icon="checkmark" size="small" variant="primary" />
    </ListItem>
    <ListItem value="e2e" ripple={false}>
      <Text text="E2E (self-hosted)" wrap />
    </ListItem>
    <ListItem value="release" ripple={false}>
      <Text text="Release candidate" wrap />
    </ListItem>
  </List>
);

export const MultipleSelection = () => (
  <List selectionMode="multiple">
    <ListItem isChecked isSelected ripple={false}>
      <Text text="Run unit tests" wrap />
    </ListItem>
    <ListItem isChecked isSelected ripple={false}>
      <Text text="Run renderer lint" wrap />
    </ListItem>
    <ListItem ripple={false}>
      <Text text="Run E2E on the self-hosted runner" wrap />
    </ListItem>
  </List>
);

export const WithHeaderAndFooter = () => (
  <List selectionMode="single" value="sym-482" inset="all">
    <Text slot="header" text="Open pull requests" wrap />
    <ListItem value="sym-482" isSelected ripple={false}>
      <Avatar slot="prefix" icon="branch" size="tiny" appearance="soft" />
      <Text text="#218 · Fix CI case-sensitive paths" wrap />
      <Chip slot="suffix" label="review" size="tiny" appearance="soft" variant="info" />
    </ListItem>
    <ListItem value="sym-479" ripple={false}>
      <Avatar slot="prefix" icon="branch" size="tiny" appearance="soft" />
      <Text text="#217 · Persist workflow versions" wrap />
      <Chip slot="suffix" label="draft" size="tiny" appearance="soft" />
    </ListItem>
    <Text slot="footer" text="2 of 6 pull requests target main" variant="neutral" wrap />
  </List>
);

export const FilterableList = () => (
  <List
    selectionMode="single"
    value="solve"
    showFilter
    filterPlaceholder="Filter skills"
    inset="all"
  >
    <ListItem value="analyze" ripple={false}>
      <Text text="analyze-change-request" wrap />
    </ListItem>
    <ListItem value="solve" isSelected ripple={false}>
      <Text text="solve-change-request" wrap />
    </ListItem>
    <ListItem value="diagnose" ripple={false}>
      <Text text="diagnose-ci-failure" wrap />
    </ListItem>
  </List>
);

export const EmptyList = () => (
  <List selectionMode="none">
    <EmptyState
      slot="empty"
      icon="flow"
      header="No workflows found"
      content="This repository has no workflow files on the default branch."
    />
  </List>
);
