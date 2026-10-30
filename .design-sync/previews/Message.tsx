import { Message, Stack } from '@pixel-brewery/mosaik-elements-react';

export const PairingStates = () => (
  <Stack orientation="vertical" gap="small">
    <Message
      appearance="soft"
      variant="info"
      fit="width"
      header="Approve on your Mac"
      content="Confirm that this phone and the verification code match."
    />
    <Message
      appearance="soft"
      variant="warning"
      fit="width"
      header="QR code expired"
      content="Generate and scan a new QR code in Symphony Desktop."
    />
    <Message
      appearance="soft"
      variant="danger"
      fit="width"
      header="Connection interrupted"
      content="The desktop app stopped responding while the pairing was confirmed."
    />
  </Stack>
);

export const WithIcons = () => (
  <Stack orientation="vertical" gap="small">
    <Message
      appearance="soft"
      variant="success"
      fit="width"
      icon="checkCircle"
      iconSize="small"
      header="Delivery completed"
      content="Pull request #482 is open and linked to the ticket."
    />
    <Message
      appearance="soft"
      variant="warning"
      fit="width"
      icon="warning"
      iconSize="small"
      header="Workspace is close to its write limit"
      content="2.1 GB of the 20 GB allocation is still reclaimable."
    />
    <Message
      appearance="soft"
      variant="danger"
      fit="width"
      icon="errorCircle"
      iconSize="small"
      header="Out of quota"
      content="The Codex account cannot start another execution until 18:00."
    />
  </Stack>
);

export const Appearances = () => (
  <Stack orientation="vertical" gap="small">
    {(['soft', 'outline', 'plain'] as const).map((appearance) => (
      <Message
        key={appearance}
        appearance={appearance}
        variant="info"
        fit="width"
        icon="info"
        iconSize="small"
        header={`${appearance} message`}
        content="Symphony uses messages for short, dismissible status information."
      />
    ))}
  </Stack>
);

export const Closeable = () => (
  <Stack orientation="vertical" gap="small">
    <Message
      appearance="soft"
      variant="info"
      fit="width"
      icon="sparkle"
      iconSize="small"
      header="New workflow version available"
      content="Adopt version 4 to pick up the automatic Qualified to Ready transition."
      closeable
    />
    <Message
      appearance="soft"
      variant="neutral"
      fit="width"
      icon="disconnect"
      iconSize="small"
      header="Board synchronisation paused"
      content="Reconnect the GitHub account to resume pulling work items."
      closeable
      disabled
    />
  </Stack>
);
