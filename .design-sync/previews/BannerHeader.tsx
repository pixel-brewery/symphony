import { Banner, BannerHeader, BannerSubHeader, Stack } from '@pixel-brewery/mosaik-elements-react';

export const SlottedHeader = () => (
  <Banner isOpen fit="width" appearance="soft" variant="info" icon="github" iconSize="small">
    <BannerHeader text="Control Symphony from GitHub" />
    <BannerSubHeader text="After enabling, comment @symphony your instruction, /symphony analyze, /symphony fix or /symphony rerun-ci in a configured GitHub issue." />
  </Banner>
);

export const HeaderOnly = () => (
  <Stack orientation="vertical" gap="small">
    <Banner isOpen fit="width" appearance="soft" variant="warning" icon="warning" iconSize="small">
      <BannerHeader text="Homebrew is required for one-click installation" />
    </Banner>
    <Banner
      isOpen
      fit="width"
      appearance="soft"
      variant="success"
      icon="checkCircle"
      iconSize="small"
    >
      <BannerHeader text="Pull request #482 is linked to the work item" />
    </Banner>
  </Stack>
);

export const Variants = () => (
  <Stack orientation="vertical" gap="small">
    {(['info', 'success', 'warning', 'danger', 'neutral'] as const).map((variant) => (
      <Banner
        key={variant}
        isOpen
        fit="width"
        appearance="soft"
        variant={variant}
        icon="executionOutline"
        iconSize="small"
      >
        <BannerHeader variant={variant} text={`${variant} — execution 4f21a9 changed state`} />
        <BannerSubHeader
          variant={variant}
          text="The banner passes its own variant to a slotted header unless the header sets one."
        />
      </Banner>
    ))}
  </Stack>
);

export const Disabled = () => (
  <Banner
    isOpen
    disabled
    fit="width"
    appearance="soft"
    variant="neutral"
    icon="disconnect"
    iconSize="small"
  >
    <BannerHeader disabled text="Agentic delivery is switched off" />
    <BannerSubHeader
      disabled
      text="Turn the feature on before the individual repair steps can be configured."
    />
  </Banner>
);
