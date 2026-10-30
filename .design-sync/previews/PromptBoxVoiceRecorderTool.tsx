import {
  Hint,
  PromptBox,
  PromptBoxVoiceRecorderTool,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// The tool assigns itself to the Prompt Box `tools` slot, so it only renders as
// a child of a PromptBox — that is also the only place Symphony uses it.

export const RecordingInPromptBox = () => (
  <PromptBox
    label="Describe the issue"
    value="The board keeps showing Analysis failed although the execution finished…"
    minRows={4}
    maxRows={10}
    appearance="outline"
    variant="highlight"
  >
    <PromptBoxVoiceRecorderTool state="recording" elapsedTime={12_000} maxDurationTime={180_000} />
  </PromptBox>
);

export const RecorderStates = () => (
  <Stack orientation="vertical" gap="medium">
    {(
      [
        ['recording', 7_000, 'Dictating a work item into the issue creator'],
        ['paused', 84_000, 'Held while the operator checks the execution log'],
        ['stopped', 160_000, 'Recording finished, waiting for transcription'],
      ] as const
    ).map(([state, elapsedTime, caption]) => (
      <Stack key={state} orientation="vertical" gap="tiny">
        <Text text={`state="${state}"`} wrap />
        <PromptBox
          appearance="outline"
          label="Describe the issue"
          value={caption}
          minRows={2}
          maxRows={4}
        >
          <PromptBoxVoiceRecorderTool
            state={state}
            elapsedTime={elapsedTime}
            maxDurationTime={180_000}
          />
        </PromptBox>
      </Stack>
    ))}
  </Stack>
);

export const DisabledRecorder = () => (
  <Stack orientation="vertical" gap="tiny">
    <Text text="Voice input is unavailable without a connected AI account" wrap />
    <PromptBox
      appearance="outline"
      label="Describe the issue"
      value="Connect a Claude or Codex account in Settings to dictate work items."
      minRows={3}
    >
      <PromptBoxVoiceRecorderTool disabled state="recording" elapsedTime={31_000} />
    </PromptBox>
    <Hint
      text="disabled keeps the elapsed time readable but blocks cancel and stop."
      textOverflow="wrap"
    />
  </Stack>
);
