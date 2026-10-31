import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

// CardActions closes a card with its commands, in order of weight: the primary
// action solid, alternatives outline, a quiet escape plain.
export const DeliveryDecision = () => (
  <Card>
    <CardHeader
      text="Start delivery for SYM-482?"
      subText="claude-opus branches from main and opens a pull request."
    />
    <CardContent>
      <Text text="Normalise case-sensitive preview paths across macOS and the Linux runner." wrap />
    </CardContent>
    <CardActions>
      <Button label="Start delivery" icon="play" appearance="solid" variant="primary" />
      <Button label="Plan only" appearance="outline" variant="primary" />
      <Button label="Not now" appearance="plain" variant="neutral" />
    </CardActions>
  </Card>
);

export const SingleAction = () => (
  <Card>
    <CardHeader text="Workspace cleanup" subText="2.1 GB reclaimable across 6 workspaces." />
    <CardActions>
      <Button label="Back" appearance="outline" variant="neutral" />
    </CardActions>
  </Card>
);
