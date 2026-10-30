import { FormField, Numberbox, Stack, Text } from '@pixel-brewery/mosaik-elements-react';

export const WorkspaceStorageLimit = () => (
  <Numberbox label="Maximum workspace size (GB)" min={2} max={1024} step={1} value={64} />
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="medium">
    {(['default', 'outline', 'soft', 'solid', 'plain'] as const).map((appearance) => (
      <Numberbox
        key={appearance}
        appearance={appearance}
        label="Concurrent executions"
        min={1}
        max={8}
        value={3}
      />
    ))}
  </Stack>
);

export const States = () => (
  <Stack orientation="vertical" gap="medium">
    <Numberbox label="Free-space reserve (GB)" placeholder="Not configured" min={5} max={200} />
    <Numberbox label="Free-space reserve (GB)" value={12} isClearable min={5} max={200} />
    <Numberbox label="Free-space reserve (GB)" value={12} isBusy min={5} max={200} />
    <Numberbox label="Free-space reserve (GB)" value={12} readonly min={5} max={200} />
    <Numberbox label="Free-space reserve (GB)" value={12} disabled min={5} max={200} />
  </Stack>
);

export const WithUnitAffixes = () => (
  <Stack orientation="vertical" gap="medium">
    <Numberbox label="Maximum workspace size" value={64} min={2} max={1024} textAlign="left">
      <Text slot="suffix" text="GB" variant="neutral" />
    </Numberbox>
    <Numberbox label="Free-space reserve" value={12} min={5} max={200} textAlign="left">
      <Text slot="suffix" text="GB" variant="neutral" />
    </Numberbox>
    <Numberbox label="Execution timeout" value={45} min={5} max={240} textAlign="left">
      <Text slot="suffix" text="min" variant="neutral" />
    </Numberbox>
  </Stack>
);

export const WithValidationError = () => (
  <FormField
    label="Maximum workspace size (GB)"
    hint="Deliveries stop once a workspace exceeds this size."
    error="The limit must stay below the 1024 GB physical allocation."
  >
    <Numberbox value={2048} min={2} max={1024} required />
  </FormField>
);
