import {
  Button,
  Chip,
  Dismiss,
  DrawerHeader,
  Hint,
  Icon,
  Stack,
  Text,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

// The panel frame stands in for the drawer surface DrawerHeader normally sits
// on, so the header's padding and its prefix/suffix slots are readable.
const panel = {
  width: '420px',
  border: '1px solid var(--mosaik-scheme-middlelight)',
  borderRadius: 'var(--mosaik-layout-radius)',
  background: 'var(--mosaik-scheme-surface)',
  overflow: 'hidden',
};

export const SettingsEditorHeader = () => (
  <div style={panel}>
    <DrawerHeader text="Add repository" subText="GitHub source control and Actions">
      <Dismiss slot="suffix" />
    </DrawerHeader>
  </div>
);

export const WithPrefixIcon = () => (
  <div style={panel}>
    <DrawerHeader text="Connect AI account" subText="Connected service">
      <Icon slot="prefix" icon="claude" size="medium" />
      <Dismiss slot="suffix" />
    </DrawerHeader>
  </div>
);

export const SlottedHeading = () => (
  <div style={panel}>
    <DrawerHeader>
      <Stack slot="header" orientation="horizontal" gap="small" verticalAlignment="center">
        <Text text="Execution 4f21c0" wrap />
        <Chip label="Streaming" appearance="soft" size="tiny" variant="info" />
      </Stack>
      <Hint
        slot="subHeader"
        text="agentic-delivery · codex/fix-ci-case-paths"
        textOverflow="wrap"
      />
      <Button slot="suffix" icon="open" appearance="plain" variant="neutral" />
    </DrawerHeader>
  </div>
);

export const InEditorDrawer = () => (
  <div style={panel}>
    <DrawerHeader text="Edit workspace" subText="Security and ownership boundary">
      <Dismiss slot="suffix" />
    </DrawerHeader>
    <Stack orientation="vertical" gap="small" style={{ padding: '0 16px 16px' }}>
      <Textbox label="Display name" value="symphony" appearance="outline" />
      <Textbox label="Repository" value="pixel-brewery/symphony" appearance="outline" />
      <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
        <Button label="Cancel" variant="neutral" appearance="outline" />
        <Button label="Save workspace" variant="primary" appearance="solid" icon="save" />
      </Stack>
    </Stack>
  </div>
);
