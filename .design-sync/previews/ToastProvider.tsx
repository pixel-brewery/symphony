import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Stack,
  Text,
  ToastProvider,
} from '@pixel-brewery/mosaik-elements-react';

export const ProviderScope = () => (
  <ToastProvider>
    <Card>
      <CardHeader text="Delivery finished" subText="SYM-412 · pixel-brewery/symphony" />
      <CardContent>
        <Text
          text="Everything under the provider can raise a toast. The provider itself renders no markup — only its children."
          wrap
        />
      </CardContent>
      <CardFooter>
        <Stack orientation="horizontal" gap="small" horizontalAlignment="right" fit="width">
          <Button label="Open pull request" icon="branch" variant="neutral" />
          <Button label="Mark reviewed" variant="primary" appearance="solid" />
        </Stack>
      </CardFooter>
    </Card>
  </ToastProvider>
);

export const AroundABoardToolbar = () => (
  <ToastProvider>
    <Stack orientation="vertical" gap="medium">
      <Text text="Board · pixel-brewery/symphony" wrap />
      <Stack orientation="horizontal" gap="small" wrap verticalAlignment="center">
        <Button label="Refresh work items" icon="sync" appearance="soft" />
        <Button label="Start delivery" icon="play" variant="primary" appearance="solid" />
        <Button label="Filter" icon="filter" appearance="plain" />
      </Stack>
      <Text
        text="Each action reports its outcome through the toast context provided here."
        variant="neutral"
        wrap
      />
    </Stack>
  </ToastProvider>
);
