import {
  Card,
  CardContent,
  CardHeader,
  Qrcode,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const MobilePairing = () => (
  <Card>
    <CardHeader text="Pair a phone" subText="Scan the code with the Symphony mobile app." />
    <CardContent>
      <Stack orientation="horizontal" gap="medium" verticalAlignment="center">
        <Qrcode text="https://symphony.local:7817/pair?c=4f19a8" dimension={200} />
        <Text
          text="The code expires automatically. If the camera is unavailable, copy the pairing address into your phone browser."
          wrap
        />
      </Stack>
    </CardContent>
  </Card>
);

export const Dimensions = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center" wrap>
    <Qrcode text="https://symphony.local:7817/pair?c=4f19a8" dimension={96} />
    <Qrcode text="https://symphony.local:7817/pair?c=4f19a8" dimension={140} />
    <Qrcode text="https://symphony.local:7817/pair?c=4f19a8" dimension={200} />
  </Stack>
);

export const ErrorCorrectionLevels = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center" wrap>
    {(['L', 'M', 'Q', 'H'] as const).map((level) => (
      <Qrcode
        key={level}
        text="https://symphony.local:7817/pair?c=4f19a8"
        dimension={120}
        errorCorrection={level}
      />
    ))}
  </Stack>
);

export const CustomColors = () => (
  <Stack orientation="horizontal" gap="medium" verticalAlignment="center" wrap>
    <Qrcode text="https://github.com/pixel-brewery/symphony/pull/2184" dimension={160} />
    <Qrcode
      text="https://github.com/pixel-brewery/symphony/pull/2184"
      dimension={160}
      foregroundColor="#B3261E"
      backgroundColor="#FFFFFF"
    />
  </Stack>
);
