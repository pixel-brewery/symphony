import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Hint,
  Sheet,
  SheetContent,
  SheetProvider,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// SheetProvider renders no markup of its own — it is the React context that
// lets anything below it open a sheet. Wrap the part of the tree that owns
// sheets (in Symphony, the presenter shell) and compose sheets inside it.
const screen = {
  position: 'relative' as const,
  width: '100%',
  height: '560px',
  overflow: 'hidden',
  background: 'var(--mosaik-scheme-background)',
};

export const SheetScope = () => (
  <SheetProvider>
    <div style={screen}>
      <Stack orientation="vertical" gap="small" style={{ padding: '16px' }}>
        <Text text="Workspace rail" wrap />
        <Hint
          text="On narrow windows the rail is presented as a sheet instead of a side panel."
          textOverflow="wrap"
        />
      </Stack>
      <Sheet isOpen isModal hasBackdrop hasHandle width="100%" height="320px">
        <SheetContent slot="content">
          <Stack orientation="vertical" gap="small">
            <Text text="Switch workspace" wrap />
            <Hint
              text="symphony · mosaik · flamox · platform-engine-frontend"
              textOverflow="wrap"
            />
            <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
              <Button label="Cancel" variant="neutral" appearance="outline" />
              <Button
                label="Open workspace"
                variant="primary"
                appearance="solid"
                icon="folderOpen"
              />
            </Stack>
          </Stack>
        </SheetContent>
      </Sheet>
    </div>
  </SheetProvider>
);

export const TriggerSurface = () => (
  <SheetProvider>
    <Card>
      <CardHeader text="Workspace rail" subText="Mobile layout" />
      <CardContent>
        <Stack orientation="vertical" gap="small">
          <Text
            text="On narrow windows the rail is presented as a sheet instead of a side panel."
            wrap
          />
          <Hint
            text="The button below calls the sheet service this provider installs."
            textOverflow="wrap"
          />
          <Stack orientation="horizontal" gap="small">
            <Button
              label="Show workspaces"
              icon="panelRight"
              variant="primary"
              appearance="outline"
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  </SheetProvider>
);
