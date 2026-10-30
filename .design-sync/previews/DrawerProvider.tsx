import {
  Button,
  Dismiss,
  DrawerHeader,
  DrawerProvider,
  Hint,
  List,
  ListItem,
  Stack,
  Text,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

// DrawerProvider renders no markup — it is the React context that lets anything
// below it open an editor drawer. Symphony wraps its settings shell in one and
// opens a drawer per editor (workspace, repository, AI account, skill import).
const panel = {
  width: '420px',
  border: '1px solid var(--mosaik-scheme-middlelight)',
  borderRadius: 'var(--mosaik-layout-radius)',
  background: 'var(--mosaik-scheme-surface)',
  overflow: 'hidden',
};

export const EditorDrawerScope = () => (
  <DrawerProvider>
    <div style={panel}>
      <DrawerHeader text="Add workspace" subText="Security and ownership boundary">
        <Dismiss slot="suffix" />
      </DrawerHeader>
      <Stack orientation="vertical" gap="small" style={{ padding: '0 16px 16px' }}>
        <Textbox label="Display name" value="platform-engine-frontend" appearance="outline" />
        <Textbox label="Managed root" value="~/.symphony/workspaces/peff" appearance="outline" />
        <Hint
          text="Keep the managed root short — unix socket paths inside it are limited."
          textOverflow="wrap"
        />
        <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
          <Button label="Cancel" variant="neutral" appearance="outline" />
          <Button label="Create workspace" variant="primary" appearance="solid" icon="add" />
        </Stack>
      </Stack>
    </div>
  </DrawerProvider>
);

export const SettingsShell = () => (
  <DrawerProvider>
    <Stack orientation="vertical" gap="small" style={{ width: '420px' }}>
      <Text text="Settings · Repositories" wrap />
      <Hint
        text="Each row opens its editor in a drawer served by this provider."
        textOverflow="wrap"
      />
      <List selectionMode="none" inset="none">
        <ListItem>
          <Stack orientation="horizontal" gap="small" verticalAlignment="center" fit="width">
            <Text text="pixel-brewery/symphony" wrap />
            <Stack orientation="horizontal" gap="tiny" horizontalAlignment="right" fit="width">
              <Button icon="edit" appearance="plain" variant="neutral" />
            </Stack>
          </Stack>
        </ListItem>
        <ListItem>
          <Stack orientation="horizontal" gap="small" verticalAlignment="center" fit="width">
            <Text text="flamox365/mosaik" wrap />
            <Stack orientation="horizontal" gap="tiny" horizontalAlignment="right" fit="width">
              <Button icon="edit" appearance="plain" variant="neutral" />
            </Stack>
          </Stack>
        </ListItem>
      </List>
      <Button label="Add repository" icon="add" appearance="outline" variant="neutral" />
    </Stack>
  </DrawerProvider>
);
