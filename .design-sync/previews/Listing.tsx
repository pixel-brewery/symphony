import { Listing, ListingItem, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const DeliveryChecklist = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="What a delivery run does" wrap />
    <Listing type="unordered">
      <ListingItem content="Clones the repository into a managed worktree." />
      <ListingItem content="Resolves the portable skills bound to this workspace." />
      <ListingItem content="Runs the agent against the ticket in an isolated execution." />
      <ListingItem content="Pushes the branch and opens a pull request that closes the issue." />
    </Listing>
  </Stack>
);

export const OrderedSteps = () => (
  <Stack orientation="vertical" gap="small">
    <Text text="Connecting a GitHub account" wrap />
    <Listing type="ordered">
      <ListingItem content="Install the GitHub CLI with Homebrew." />
      <ListingItem content="Run gh auth login and pick the SSH protocol." />
      <ListingItem content="Open Settings · Connected services and pick the account." />
      <ListingItem content="Bind at least one repository to the workspace." />
    </Listing>
  </Stack>
);

export const BulletTypes = () => (
  <Stack orientation="vertical" gap="large">
    {(['disc', 'circle', 'square', 'dash'] as const).map((bulletType) => (
      <Stack key={bulletType} orientation="vertical" gap="tiny">
        <Text text={bulletType} variant="neutral" wrap />
        <Listing type="unordered" bulletType={bulletType}>
          <ListingItem content="Managed workspaces" />
          <ListingItem content="Cached runner images" />
          <ListingItem content="Execution history" />
        </Listing>
      </Stack>
    ))}
  </Stack>
);

export const NumberingTypes = () => (
  <Stack orientation="vertical" gap="large">
    {(['1', 'a', 'A', 'I'] as const).map((numberingType) => (
      <Stack key={numberingType} orientation="vertical" gap="tiny">
        <Text text={`numberingType="${numberingType}"`} variant="neutral" wrap />
        <Listing type="ordered" numberingType={numberingType}>
          <ListingItem content="Qualify the ticket" />
          <ListingItem content="Run the delivery" />
          <ListingItem content="Review the pull request" />
        </Listing>
      </Stack>
    ))}
  </Stack>
);

export const StartAndReversed = () => (
  <Stack orientation="vertical" gap="large">
    <Stack orientation="vertical" gap="tiny">
      <Text text="start=4 — continuing the runbook after a page break" variant="neutral" wrap />
      <Listing type="ordered" start={4}>
        <ListingItem content="Re-run the failed job on the self-hosted runner." />
        <ListingItem content="Compare the software report with the hosted image." />
        <ListingItem content="Pin the runner image in the repository binding." />
      </Listing>
    </Stack>
    <Stack orientation="vertical" gap="tiny">
      <Text text="reversed — rollback order" variant="neutral" wrap />
      <Listing type="ordered" reversed start={3}>
        <ListingItem content="Delete the managed worktree." />
        <ListingItem content="Close the pull request." />
        <ListingItem content="Move the work item back to Ready." />
      </Listing>
    </Stack>
  </Stack>
);

export const Sizes = () => (
  <Stack orientation="vertical" gap="large">
    {(['small', 'medium', 'large'] as const).map((size) => (
      <Stack key={size} orientation="vertical" gap="tiny">
        <Text text={size} variant="neutral" wrap />
        <Listing type="unordered" size={size}>
          <ListingItem content="Board · 18 work items" />
          <ListingItem content="Deliveries · 2 running" />
          <ListingItem content="Skills · 7 resolved" />
        </Listing>
      </Stack>
    ))}
  </Stack>
);
