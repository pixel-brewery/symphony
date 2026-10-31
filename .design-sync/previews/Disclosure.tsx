import { Disclosure, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const RunProtocol = () => (
  <Disclosure summary="Protocol · yarn nx run-many --target=test">
    <Text text="42 passed, 0 failed in 2m 18s" wrap />
  </Disclosure>
);

export const WorkflowSteps = () => (
  <Stack orientation="vertical" gap="small">
    <Disclosure summary="Set up job">
      <Text text="Runner image ubuntu-24.04 · 4s" wrap />
    </Disclosure>
    <Disclosure summary="Restore yarn cache">
      <Text text="Cache hit on key yarn-lock-8f21c4 · 11s" wrap />
    </Disclosure>
    <Disclosure summary="Run renderer unit tests">
      <Text text="1 284 specs across 22 projects · 2m 18s" wrap />
    </Disclosure>
  </Stack>
);

export const ExecutionDetails = () => (
  <Stack orientation="vertical" gap="small">
    <Disclosure summary="Execution 8f21c4 · Claude Opus">
      <Text
        text="Streamed 128 events across 6 tool calls before the pull request was opened."
        wrap
      />
    </Disclosure>
    <Disclosure summary="Execution 4b90de · Codex">
      <Text text="Stopped after the setup script exited with code 1." wrap />
    </Disclosure>
  </Stack>
);
