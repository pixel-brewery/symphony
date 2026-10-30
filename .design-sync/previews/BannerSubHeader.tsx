import { Banner, BannerHeader, BannerSubHeader, Stack } from '@pixel-brewery/mosaik-elements-react';

export const SlottedSubHeader = () => (
  <Banner isOpen fit="width" appearance="soft" variant="danger" icon="errorCircle" iconSize="small">
    <BannerHeader text="Alarm: new disk-writing work is blocked" />
    <BannerSubHeader text="Symphony stopped new AI tasks, worktrees, verification, and Local GitHub Actions. Clear managed data before continuing." />
  </Banner>
);

export const LongExplanation = () => (
  <Banner isOpen fit="width" appearance="soft" variant="warning" icon="warning" iconSize="small">
    <BannerHeader text="Automatic AI work is waiting for local preparation" />
    <BannerSubHeader text="symphony/desktop, symphony/mobile and symphony/orchestrator: prepare each repository under Repositories before unattended work can start. Preparation clones the repository into the managed workspace root, runs the repository setup script, and verifies that the delivery branch can be pushed." />
  </Banner>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['info', 'success', 'warning', 'neutral'] as const).map((variant) => (
      <Banner
        key={variant}
        isOpen
        fit="width"
        appearance="soft"
        variant={variant}
        icon="info"
        iconSize="small"
      >
        <BannerHeader variant={variant} text={`${variant} board notice`} />
        <BannerSubHeader
          variant={variant}
          text="A sub-header carries the sentence that explains what the operator has to do next."
        />
      </Banner>
    ))}
  </Stack>
);

export const WithoutHeader = () => (
  <Banner isOpen fit="width" appearance="soft" variant="neutral" icon="info" iconSize="small">
    <BannerSubHeader text="Board refresh runs every 15 minutes; the last synchronisation finished at 09:42." />
  </Banner>
);
