import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Text,
} from '@pixel-brewery/mosaik-elements-react';

export const TitleAndSubtitle = () => (
  <Stack orientation="vertical" gap="medium">
    <Card>
      <CardHeader
        text="Execution and automation"
        subText="Control managed workspaces, scheduling, and execution capacity."
      />
      <CardContent text="Six managed workspaces, two of them currently running a delivery." />
    </Card>
    <Card>
      <CardHeader
        text="Connected services"
        subText="GitHub, Azure DevOps, and the AI accounts every agent runs on."
      />
      <CardContent text="GitHub (RueDeRennes) · Claude Code · Codex" />
    </Card>
  </Stack>
);

export const PrefixSlot = () => (
  <Stack orientation="vertical" gap="medium">
    <Card>
      <CardHeader text="symphony" subText="Available">
        <Avatar slot="prefix" size="medium" appearance="soft" text="SY" />
      </CardHeader>
      <CardContent text="/home/example/github/symphony · main" />
    </Card>
    <Card>
      <CardHeader text="mosaik" subText="Disabled by the workspace owner">
        <Avatar slot="prefix" size="medium" appearance="soft" variant="neutral" text="MO" />
      </CardHeader>
      <CardContent text="Read-only reference checkout, never delivered against." />
    </Card>
  </Stack>
);

export const SuffixAction = () => (
  <Card>
    <CardHeader
      text="Developer tools"
      subText="Check the local CLIs Symphony uses for repositories, GitHub, and AI accounts."
    >
      <Button slot="suffix" label="Refresh" icon="sync" appearance="plain" />
    </CardHeader>
    <CardContent text="Git 2.51.0 · GitHub CLI 2.62.0 · Docker not detected" />
  </Card>
);

export const PrefixAndSuffixTogether = () => (
  <Card>
    <CardHeader
      text="Repository audit"
      subText="Portable skill · reads the repository and never writes to it"
    >
      <Avatar slot="prefix" size="medium" appearance="soft" variant="highlight" icon="skills" />
      <Badge slot="suffix" appearance="soft" label="v3.2.0" />
    </CardHeader>
    <CardContent text="Last run 2 hours ago against pixel-brewery/symphony." />
  </Card>
);

export const CustomHeaderSlots = () => (
  <Card>
    <CardHeader>
      <Stack slot="header" orientation="horizontal" gap="small" verticalAlignment="center">
        <Text text="Delivery #418" />
        <Badge appearance="soft" variant="success" label="Merged" size="small" />
      </Stack>
      <Text
        slot="subHeader"
        text="codex/fix-ci-case-paths → main · 4 files changed"
        variant="neutral"
        wrap
      />
      <Button slot="suffix" label="Open pull request" icon="open" appearance="plain" />
    </CardHeader>
    <CardContent text="Renamed four files whose case-only paths broke CI on the Linux runners." />
  </Card>
);
