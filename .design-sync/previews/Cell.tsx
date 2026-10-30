import { Avatar, Button, Cell, CellGroup, Icon, Text } from '@pixel-brewery/mosaik-elements-react';

export const RuntimeDependencies = () => (
  <CellGroup header="Developer tools">
    <Cell label="Git" subLabel="2.51.0 · /opt/homebrew/bin/git">
      <Avatar slot="start" size="small" appearance="soft" icon="branch" />
      <Text slot="end" text="Ready" variant="success" />
    </Cell>
    <Cell label="GitHub CLI" subLabel="2.62.0 · authenticated as RueDeRennes">
      <Avatar slot="start" size="small" appearance="soft" icon="github" />
      <Text slot="end" text="Ready" variant="success" />
    </Cell>
    <Cell label="Docker" subLabel="Not detected on this machine">
      <Avatar slot="start" size="small" appearance="soft" icon="settings" />
      <Text slot="end" text="Missing" variant="danger" />
    </Cell>
  </CellGroup>
);

export const LabelAndSubLabel = () => (
  <CellGroup header="GitHub Actions usage">
    <Cell label="Used minutes" subLabel="1 480 of 2 000 included minutes" />
    <Cell label="Remaining minutes" subLabel="520 · resets on 1 October" />
    <Cell label="Billing cycle" subLabel="3 September 2026 – 1 October 2026" />
  </CellGroup>
);

export const WithEndActions = () => (
  <CellGroup header="Paired mobile devices">
    <Cell label="Andre's iPhone" subLabel="Connected · last seen 2 minutes ago">
      <Avatar slot="start" size="small" appearance="soft" icon="person" />
      <Button slot="end" label="Revoke" appearance="plain" variant="danger" />
    </Cell>
    <Cell label="Studio iPad" subLabel="Verification code 418-902">
      <Avatar slot="start" size="small" appearance="soft" icon="person" />
      <Button slot="end" label="Approve" appearance="solid" variant="primary" />
    </Cell>
  </CellGroup>
);

export const NavigationAndDisabled = () => (
  <CellGroup header="Repositories">
    <Cell label="pixel-brewery/symphony" subLabel="main · 6 open work items" isNavigation>
      <Icon slot="end" icon="chevronRight" size="small" />
    </Cell>
    <Cell label="RueDeRennes/mosaik" subLabel="main · read-only reference" isNavigation>
      <Icon slot="end" icon="chevronRight" size="small" />
    </Cell>
    <Cell label="RueDeRennes/flamox" subLabel="Binding disabled by the workspace owner" disabled>
      <Icon slot="end" icon="chevronRight" size="small" disabled />
    </Cell>
  </CellGroup>
);
