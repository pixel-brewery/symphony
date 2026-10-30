import {
  Cell,
  CellGroup,
  Expander,
  Hint,
  Stack,
  Text,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

export const ExpertSettings = () => (
  <Expander
    header="Expert settings"
    subHeader="Credential reference and gateway address"
    isExpanded
  >
    <Stack orientation="vertical" gap="medium">
      <Textbox label="Credential reference (optional)" placeholder="env:AI_PROVIDER_API_KEY" />
      <Textbox label="Gateway address" value="https://api.anthropic.com" />
      <Hint
        text="The key is handed to the Codex CLI once and never stored by Symphony."
        textOverflow="wrap"
      />
    </Stack>
  </Expander>
);

export const CollapsedSections = () => (
  <Stack orientation="vertical" gap="small">
    <Expander
      header="Technical AI setup"
      subHeader="Positions, providers, models, and automatic backup routes"
    />
    <Expander
      header="Feedback intake"
      subHeader="Turn requested FLAMOX365 feedback from Microsoft Teams into tickets"
    />
    <Expander
      header="Enter project manually"
      subHeader="Owner type, owner login and project number from the project URL"
      disabled
    />
  </Stack>
);

export const WithActionsSlot = () => (
  <Expander header="Ready for delivery" icon="board" isExpanded>
    <Text slot="actions" text="3 items" variant="neutral" />
    <CellGroup>
      <Cell label="Fix CI case-sensitive paths" subLabel="symphony · #482" />
      <Cell label="Storage governor event loop" subLabel="symphony · #479" />
      <Cell label="Managed workspace path length" subLabel="symphony · #471" />
    </CellGroup>
  </Expander>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="small">
    {(['solid', 'soft', 'outline', 'plain'] as const).map((appearance) => (
      <Expander
        key={appearance}
        appearance={appearance}
        variant="neutral"
        header={`${appearance} expander`}
        subHeader="Workspace section header"
        isExpanded
      >
        <Text text="Symphony groups long settings sections behind an expander." wrap />
      </Expander>
    ))}
  </Stack>
);
