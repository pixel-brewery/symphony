import {
  Button,
  Cell,
  CellGroup,
  Stack,
  Stepper,
  StepperItem,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const ContentOfTheActiveStep = () => (
  <Stepper orientation="vertical">
    <StepperItem
      header="Review the change request"
      description="Everything the agent will read before it edits a file."
      icon="clipboardTask"
      iconSize="large"
    >
      <CellGroup>
        <Cell label="Ticket" subLabel="#402 · Fix CI case-only paths" />
        <Cell label="Repository" subLabel="pixel-brewery/symphony · main" />
        <Cell label="Skill" subLabel="solve-change-request · may publish a pull request" />
      </CellGroup>
    </StepperItem>
    <StepperItem
      header="Run the delivery"
      description="Only the active step projects its content."
      icon="play"
      iconSize="large"
    />
  </Stepper>
);

export const FooterActions = () => (
  <Stepper orientation="vertical">
    <StepperItem
      header="Confirm the managed worktree"
      description="Symphony never writes to your own checkout."
      icon="folderOpen"
      iconSize="large"
    >
      <Text text="~/Library/Application Support/Symphony/ws/symphony/delivery-418" wrap />
      <Stack
        slot="footer"
        orientation="horizontal"
        gap="small"
        horizontalAlignment="right"
        fit="width"
      >
        <Button label="Back" appearance="plain" />
        <Button label="Create worktree" variant="primary" appearance="solid" />
      </Stack>
    </StepperItem>
    <StepperItem
      header="Run the agent"
      description="Claude Code · high effort"
      icon="play"
      iconSize="large"
    />
  </Stepper>
);

export const HintAndErrorState = () => (
  <Stepper orientation="horizontal">
    <StepperItem header="Prepare" description="Worktree and skills resolved" state="completed">
      <Text
        text="The instruction-compliance gate found two scratch files in the worktree, so the run stops before publishing."
        wrap
      />
    </StepperItem>
    <StepperItem
      header="Verify"
      description="yarn agents:check exited with code 1"
      hint="Blocks the pull request"
      state="error"
      icon="errorCircle"
    />
    <StepperItem header="Publish" description="Waiting for verification" state="pending" />
  </Stepper>
);

export const IconSizes = () => (
  <Stepper orientation="horizontal">
    <StepperItem header="Board" icon="board" iconSize="small" description="iconSize small" />
    <StepperItem header="Delivery" icon="branch" iconSize="medium" description="iconSize medium" />
    <StepperItem header="Review" icon="eyeShow" iconSize="large" description="iconSize large" />
  </Stepper>
);

export const DisabledStep = () => (
  <Stepper orientation="horizontal">
    <StepperItem header="Analyze" description="Writes an implementation handoff" state="completed">
      <Text text="A disabled step stays in the header but cannot be opened." wrap />
    </StepperItem>
    <StepperItem header="Solve" description="Implements the approved change request" />
    <StepperItem header="Publish" description="This skill reads only" disabled />
  </Stepper>
);
