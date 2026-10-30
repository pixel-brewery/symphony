import {
  Button,
  Cell,
  CellGroup,
  Divider,
  Popup,
  Searchbox,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

const anchorWidth = { width: 'fit-content' } as const;
const popupBody = { maxWidth: '340px' } as const;

export const GlobalSearchResults = () => (
  <Stack orientation="vertical" gap="small" fit="width">
    <Text text="The workspace search opens its result list in a popup pinned to the input." wrap />
    <Popup trigger="manual" isOpen placement="bottom" sync="width" interactive elevation="regular">
      <Searchbox placeholder="Search workspace…" value="ci case" variant="primary" isClearable />
      <CellGroup slot="content">
        <Cell label="#402 · Fix CI case-only paths" subLabel="Work item · Delivered" />
        <Cell label="codex/fix-ci-case-paths" subLabel="Branch · 4 files changed" />
        <Cell label="diagnose-ci-failure" subLabel="Portable skill · reads only" />
      </CellGroup>
    </Popup>
  </Stack>
);

export const ConfirmationPopup = () => (
  <Stack orientation="vertical" gap="small" horizontalAlignment="left">
    <Text text="A confirmation popup anchored to the action that opened it." wrap />
    <div style={anchorWidth}>
      <Popup trigger="manual" isOpen placement="bottom-start" interactive elevation="regular">
        <Button label="Remove workspace" icon="delete" appearance="soft" variant="danger" />
        <div slot="content" style={popupBody}>
          <Stack orientation="vertical" gap="small">
            <Text text="Remove delivery-418?" />
            <Text
              text="The worktree and its execution history are deleted. The branch already pushed to GitHub is kept."
              variant="neutral"
              wrap
            />
            <Divider />
            <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
              <Button label="Cancel" appearance="plain" />
              <Button label="Remove" appearance="solid" variant="danger" />
            </Stack>
          </Stack>
        </div>
      </Popup>
    </div>
  </Stack>
);

export const PlacementBesideTheAnchor = () => (
  <Stack orientation="vertical" gap="small" horizontalAlignment="left">
    <Text
      text={'placement="right-start" — the popup sits beside its anchor instead of below it.'}
      wrap
    />
    <div style={anchorWidth}>
      <Popup
        trigger="manual"
        isOpen
        placement="right-start"
        distance={8}
        interactive
        elevation="regular"
      >
        <Button label="Claude · primary" icon="claude" appearance="soft" variant="primary" />
        <Stack slot="content" orientation="vertical" gap="tiny">
          <Text text="contributor@example.invalid" wrap />
          <Text text="Model claude-opus-5 · high effort" variant="neutral" wrap />
          <Text text="Backup account: Codex" variant="neutral" wrap />
        </Stack>
      </Popup>
    </div>
  </Stack>
);

export const ClosedUntilTriggered = () => (
  <Stack orientation="vertical" gap="small" horizontalAlignment="left">
    <Text
      text={
        'With trigger="click" only the default-slot anchor renders; the content slot stays in the portal until a user opens it.'
      }
      wrap
    />
    <div style={anchorWidth}>
      <Popup trigger="click" placement="bottom-start" interactive>
        <Button label="Workspace actions" icon="settings" appearance="soft" />
        <Stack slot="content" orientation="vertical" gap="tiny">
          <Text text="Rebuild runner image" wrap />
          <Text text="Reclaim 2.1 GB" wrap />
        </Stack>
      </Popup>
    </div>
  </Stack>
);
