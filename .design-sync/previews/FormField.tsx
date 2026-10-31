import {
  Button,
  FormField,
  Select,
  SelectItem,
  Stack,
  Textbox,
} from '@pixel-brewery/mosaik-elements-react';

export const TaskDialogFields = () => (
  <Stack orientation="vertical" gap="medium">
    <FormField label="Title" hint="Shown on the board card and used as the pull-request title.">
      <Textbox required value="Keep renamed file paths case-sensitive in CI" />
    </FormField>
    <FormField label="Description" hint="Markdown is rendered when the work item is viewed.">
      <Textbox
        multiline
        multilineRows={5}
        resize="vertical"
        value={
          'The macOS runner treats app.html and App.html as the same file.\n\nRename through git mv so the index records the new casing.'
        }
      />
    </FormField>
  </Stack>
);

export const Validation = () => (
  <Stack orientation="vertical" gap="medium">
    <FormField
      label="Target branch"
      error="main already has an open Symphony pull request for this claim."
    >
      <Textbox invalid value="main" />
    </FormField>
    <FormField label="Repository" hint="Only prepared repositories can run unattended work.">
      <Select label="" value="symphony/desktop">
        <SelectItem value="symphony/desktop" label="symphony/desktop" />
        <SelectItem value="symphony/mobile" label="symphony/mobile" />
      </Select>
    </FormField>
  </Stack>
);

export const WithActions = () => (
  <FormField
    label="Description"
    hint="The agent rewrites the description from the linked issue and the repository skills."
  >
    <Button slot="actions" label="Draft with AI" icon="sparkle" appearance="plain" size="small" />
    <Textbox
      multiline
      multilineRows={5}
      resize="vertical"
      value={
        'Symphony should stop new disk-writing work once the managed root passes its hard write limit.'
      }
    />
  </FormField>
);

export const Disabled = () => (
  <Stack orientation="vertical" gap="medium">
    <FormField
      label="Workspace root"
      hint="Change the root under Storage safety before starting new work."
    >
      <Textbox value="/Users/operator/Symphony/workspaces" />
    </FormField>
    <FormField
      disabled
      label="Local CI image"
      hint="Local GitHub Actions are blocked while the storage alarm is active."
    >
      <Textbox disabled value="ghcr.io/actions/runner-images:macos-15" />
    </FormField>
  </Stack>
);
