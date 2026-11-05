// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export function provideMobilePresentationNavigation(): EnvironmentProviders {
  return provideNavigationItems([
    {
      key: 'settings',
      get label() {
        return translateLabel('loc.symphony.labels.settings.74a883a');
      },
      icon: 'settings',
      route: '/settings',
      order: 40,
      region: 'mobile-main',
    },
  ]);
}
