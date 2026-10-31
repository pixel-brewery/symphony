// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';

// #endregion

export function provideMobilePresentationNavigation(): EnvironmentProviders {
  return provideNavigationItems([
    {
      key: 'settings',
      label: 'Settings',
      icon: 'settings',
      route: '/settings',
      order: 40,
      region: 'mobile-main',
    },
  ]);
}
