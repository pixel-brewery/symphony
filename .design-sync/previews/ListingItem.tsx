import { Icon, Listing, ListingItem, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const HeaderAndContent = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Release checklist for the desktop build" wrap />
    <Listing type="ordered">
      <ListingItem
        header="Run the local verification"
        content="yarn agents:check plus the renderer specs. The instruction-compliance gate fails on stray scratch files."
      />
      <ListingItem
        header="Capture the storage report"
        content="Managed workspaces, runner images, and the bounded browser cache must stay under the hard write limit."
      />
      <ListingItem
        header="Open the pull request"
        content="The body needs a closing keyword; a bare issue URL does not link the ticket."
      />
    </Listing>
  </Stack>
);

export const CustomMarkers = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="A slotted marker replaces the auto-generated bullet" wrap />
    <Listing type="unordered">
      <ListingItem
        header="Checks passed"
        content="Renderer specs, orchestrator specs and the E2E canary are green."
      >
        <Icon slot="marker" icon="checkmarkCircle" size="small" variant="success" />
      </ListingItem>
      <ListingItem
        header="Runner drift"
        content="The self-hosted image is two software reports behind the hosted one."
      >
        <Icon slot="marker" icon="warning" size="small" variant="warning" />
      </ListingItem>
      <ListingItem
        header="Delivery failed"
        content="Unix socket path exceeded the limit inside the managed worktree."
      >
        <Icon slot="marker" icon="errorCircle" size="small" variant="danger" />
      </ListingItem>
      <ListingItem header="Queued" content="Two claims are waiting for an execution slot.">
        <Icon slot="marker" icon="executionOutline" size="small" variant="info" />
      </ListingItem>
    </Listing>
  </Stack>
);

export const CustomOrdinals = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Sprint rank overrides the position in the list" wrap />
    <Listing type="ordered">
      <ListingItem
        value={3}
        header="Fix CI case-only paths"
        content="Delivered · merged into main"
      />
      <ListingItem value={1} header="Storage governor blind window" content="In review" />
      <ListingItem value={2} header="Mobile pairing approval flow" content="Qualified" />
    </Listing>
  </Stack>
);

export const DisabledItem = () => (
  <Listing type="unordered">
    <ListingItem
      header="Analyze"
      content="Reads the ticket and writes an implementation handoff."
    />
    <ListingItem
      header="Solve"
      content="Implements the approved change request in a managed worktree."
    />
    <ListingItem
      disabled
      header="Publish"
      content="Unavailable — this skill is not allowed to open pull requests."
    />
  </Listing>
);

export const ContentOnlyDensity = () => (
  <Stack orientation="vertical" gap="large">
    {(['small', 'medium', 'large'] as const).map((size) => (
      <Stack key={size} orientation="vertical" gap="tiny">
        <Text text={size} variant="neutral" wrap />
        <Listing type="unordered" bulletType="dash">
          <ListingItem size={size} content="apps/renderer · Angular shell and views" />
          <ListingItem size={size} content="libs/frontend · presenters and feature libraries" />
          <ListingItem
            size={size}
            content="apps/orchestrator · execution and workspace management"
          />
        </Listing>
      </Stack>
    ))}
  </Stack>
);
