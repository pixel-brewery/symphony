import {
  Avatar,
  Button,
  Chip,
  Icon,
  List,
  ListItem,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const WithPrefixAndSuffix = () => (
  <List selectionMode="none">
    <ListItem ripple={false}>
      <Avatar slot="prefix" icon="github" size="tiny" appearance="soft" />
      <Text text="RueDeRennes" wrap />
      <Chip slot="suffix" label="connected" size="tiny" appearance="soft" variant="success" />
    </ListItem>
    <ListItem ripple={false}>
      <Avatar slot="prefix" icon="claude" size="tiny" appearance="soft" />
      <Text text="contributor@example.invalid" wrap />
      <Chip slot="suffix" label="connected" size="tiny" appearance="soft" variant="success" />
    </ListItem>
    <ListItem ripple={false}>
      <Avatar slot="prefix" icon="openai" size="tiny" appearance="soft" />
      <Text text="Codex" wrap />
      <Button slot="suffix" label="Sign in" appearance="outline" size="tiny" />
    </ListItem>
  </List>
);

export const SelectedAndDisabled = () => (
  <List selectionMode="single" value="ready">
    <ListItem value="ready" isSelected ripple={false}>
      <Text text="SYM-482 · Fix CI case-sensitive paths" wrap />
      <Icon slot="suffix" icon="checkmark" size="small" variant="primary" />
    </ListItem>
    <ListItem value="review" ripple={false}>
      <Text text="SYM-479 · Persist workflow versions" wrap />
    </ListItem>
    <ListItem value="archived" disabled ripple={false}>
      <Text text="SYM-201 · Archived, cannot be delivered" wrap />
    </ListItem>
  </List>
);

export const CheckedItems = () => (
  <List selectionMode="multiple">
    <ListItem isChecked isSelected ripple={false}>
      <Text text="Delete finished worktrees" wrap />
    </ListItem>
    <ListItem isChecked isSelected ripple={false}>
      <Text text="Drop execution logs older than 30 days" wrap />
    </ListItem>
    <ListItem ripple={false}>
      <Text text="Remove the cloned repository cache" wrap />
    </ListItem>
  </List>
);

export const TwoLineRows = () => (
  <List selectionMode="single" value="symphony">
    <ListItem value="symphony" isSelected ripple={false}>
      <Avatar slot="prefix" icon="folder" size="small" appearance="soft" />
      <Text text="symphony" wrap />
      <Text text="pixel-brewery/symphony · 8.2 GB · 3 worktrees" variant="neutral" wrap />
      <Chip slot="suffix" label="active" size="tiny" appearance="soft" variant="success" />
    </ListItem>
    <ListItem value="mosaik" ripple={false}>
      <Avatar slot="prefix" icon="folder" size="small" appearance="soft" />
      <Text text="mosaik" wrap />
      <Text text="pixel-brewery/mosaik · 6.1 GB · read-only reference" variant="neutral" wrap />
    </ListItem>
  </List>
);
