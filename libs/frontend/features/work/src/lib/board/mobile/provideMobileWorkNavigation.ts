// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';

// #endregion

/**
 * Contributes Work's existing Home and Board destinations to the mobile navigation.
 *
 * @returns The existing Mobile registry registrations.
 * @public
 */
export function provideMobileWorkNavigation(): EnvironmentProviders {
  return provideNavigationItems([
    {
      key: 'home',
      label: 'Home',
      icon: 'home',
      route: '/home',
      order: 10,
      region: 'mobile-main',
    },
    {
      key: 'board',
      label: 'Board',
      icon: 'board',
      route: '/board',
      order: 20,
      region: 'mobile-main',
    },
  ]);
}
