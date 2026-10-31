import {
  Button,
  Choice,
  ChoiceGroup,
  Stack,
  Stepper,
  StepperItem,
  Text,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

export const AgentWizard = () => (
  <Stepper orientation="vertical">
    <StepperItem
      header="1. Which AI does this agent use?"
      description="Pick a connected AI account, then the model and effort it should run with."
      icon="sparkle"
      iconSize="large"
    >
      <Stack orientation="vertical" gap="small">
        <Text text="AI account" wrap />
        <ChoiceGroup
          name="wizard-account"
          orientation="horizontal"
          appearance="outline"
          variant="primary"
          value="claude-primary"
        >
          <Choice
            value="claude-primary"
            appearance="outline"
            variant="primary"
            icon="claude"
            label="Claude · primary"
          />
          <Choice
            value="codex-backup"
            appearance="outline"
            variant="primary"
            icon="openai"
            label="Codex · backup"
          />
        </ChoiceGroup>
      </Stack>
    </StepperItem>
    <StepperItem
      header="2. Who is this agent?"
      description="Give it a name and a job title so everyone knows what it is responsible for."
      icon="person"
      iconSize="large"
    />
    <StepperItem
      header="3. What does this agent do?"
      description="Choose what this agent is responsible for. The instructions each responsibility follows are configured once under Settings · Skills."
      icon="clipboardTask"
      iconSize="large"
    />
    <StepperItem
      header="4. What happens when the AI is unavailable?"
      description="Choose backup accounts. Symphony routes around quotas, outages, and limits by itself."
      icon="sync"
      iconSize="large"
    />
  </Stepper>
);

export const HorizontalDeliveryFlow = () => (
  <Stepper orientation="horizontal">
    <StepperItem
      header="Qualify"
      description="Ticket reviewed"
      state="completed"
      icon="checkmarkCircle"
    >
      <Text text="The work item has an acceptance criterion and a bound repository." wrap />
    </StepperItem>
    <StepperItem
      header="Workspace"
      description="Worktree ready"
      state="completed"
      icon="folderOpen"
    />
    <StepperItem header="Run agent" description="Claude Code" icon="play" />
    <StepperItem header="Pull request" description="Closes #402" icon="branch" />
  </Stepper>
);

export const StepStates = () => (
  <Stepper orientation="horizontal">
    <StepperItem header="Clone" description="Managed worktree ready" state="completed">
      <Text
        text="completed steps are green, the errored step is red, pending steps stay neutral."
        wrap
      />
    </StepperItem>
    <StepperItem header="Install" description="yarn install --immutable" state="completed" />
    <StepperItem
      header="Verify"
      description="Renderer specs failed"
      state="error"
      hint="Needs attention"
    />
    <StepperItem header="Publish" description="Blocked until verification passes" state="pending" />
  </Stepper>
);

export const VerticalWithForm = () => (
  <Stepper orientation="vertical">
    <StepperItem
      header="Name the workspace"
      description="Short names keep the managed worktree path under the unix socket limit."
      icon="edit"
      iconSize="large"
    >
      <Stack orientation="vertical" gap="small" fit="width">
        <Textbox label="Workspace name" value="symphony" />
        <Text
          text="Managed at ~/Library/Application Support/Symphony/ws/symphony"
          variant="neutral"
          wrap
        />
      </Stack>
    </StepperItem>
    <StepperItem
      header="Bind a repository"
      description="One repository per binding, with its own setup script."
      icon="github"
      iconSize="large"
    />
    <StepperItem
      header="Pick the runner image"
      description="Pinned per workspace so CI parity does not drift."
      icon="settings"
      iconSize="large"
    />
  </Stepper>
);

export const StepperFooter = () => (
  <Stepper orientation="horizontal">
    <StepperItem header="Qualify" description="Ticket reviewed" state="completed">
      <Text
        text="The stepper's own footer slot holds the navigation that applies to the whole wizard, not to one step."
        wrap
      />
    </StepperItem>
    <StepperItem header="Run agent" description="Execution 4f21c9" />
    <StepperItem header="Review" description="Waiting for the pull request" />
    <Stack
      slot="footer"
      orientation="horizontal"
      gap="small"
      horizontalAlignment="right"
      fit="width"
    >
      <Button label="Back" appearance="plain" disabled />
      <Button label="Next step" variant="primary" appearance="solid" />
    </Stack>
  </Stepper>
);
