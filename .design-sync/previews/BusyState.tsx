import {
  BusyState,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const MeasuringStorage = () => (
  <BusyState
    header="Measuring storage"
    content="Counting every managed file against the 40 GB limit."
  />
);

export const InlineStatus = () => <BusyState content="Preparing the pairing request…" />;

export const WithCancelAction = () => (
  <BusyState
    header="Delivery running"
    content="Claude is working on SYM-412 in workspace WS-7. This usually takes a few minutes."
  >
    <Stack slot="actions" orientation="horizontal" gap="small" horizontalAlignment="center">
      <Button label="Open execution" icon="executionOutline" appearance="soft" />
      <Button label="Cancel run" variant="danger" appearance="soft" />
    </Stack>
  </BusyState>
);

export const InsideCard = () => (
  <Card>
    <CardHeader text="Repository binding" subText="pixel-brewery/symphony" />
    <CardContent>
      <Stack orientation="vertical" gap="small">
        <BusyState header="Cloning repository" content="Fetching 4 of 12 refs…" />
        <Text text="The workspace opens as soon as the checkout finishes." variant="neutral" wrap />
      </Stack>
    </CardContent>
  </Card>
);
