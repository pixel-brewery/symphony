import {
  Cell,
  CellGroup,
  Expander,
  ExpanderGroup,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const JoinedBoardColumns = () => (
  <ExpanderGroup mode="multiple" stacking="joined">
    <Expander header="Ready" isExpanded>
      <CellGroup>
        <Cell label="Fix CI case-sensitive paths" subLabel="symphony · #482" />
        <Cell label="Storage governor event loop" subLabel="symphony · #479" />
      </CellGroup>
    </Expander>
    <Expander header="In delivery">
      <CellGroup>
        <Cell label="Managed workspace path length" subLabel="symphony · #471" />
      </CellGroup>
    </Expander>
    <Expander header="In review">
      <CellGroup>
        <Cell label="Runner image parity" subLabel="symphony · #466" />
      </CellGroup>
    </Expander>
  </ExpanderGroup>
);

export const SeparatedSettingsSections = () => (
  <ExpanderGroup mode="multiple" stacking="separated">
    <Expander header="Boards" subHeader="GitHub Projects and Azure DevOps queries" isExpanded>
      <Text text="Each board is one GitHub Project. Columns follow the project." wrap />
    </Expander>
    <Expander
      header="Repositories"
      subHeader="Bindings, setup scripts, and default branches"
      isExpanded
    >
      <Text text="A setup script per repository binding prepares the managed workspace." wrap />
    </Expander>
    <Expander header="Accounts" subHeader="GitHub, Claude, and Codex credentials" />
  </ExpanderGroup>
);

export const SoftGroup = () => (
  <ExpanderGroup mode="multiple" stacking="joined" appearance="soft" variant="neutral">
    <Expander header="Storage safety" subHeader="Write limits and free-space reserve" isExpanded>
      <Text text="18.4 GB across 6 workspaces · 2.1 GB reclaimable" wrap />
    </Expander>
    <Expander header="Updates" subHeader="Release channel and automatic download" />
    <Expander header="Skill imports" subHeader="Portable skills packaged as .skill archives" />
  </ExpanderGroup>
);

export const SingleModeAtRest = () => (
  <ExpanderGroup mode="single" stacking="joined">
    <Expander header="Ready" subHeader="4 work items" />
    <Expander header="In delivery" subHeader="1 work item" />
    <Expander header="In review" subHeader="2 work items" />
  </ExpanderGroup>
);
