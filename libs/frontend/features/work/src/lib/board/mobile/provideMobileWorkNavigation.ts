// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
      get label() {
        return translateLabel('loc.symphony.labels.home.3a78695');
      },
      icon: 'home',
      route: '/home',
      order: 10,
      region: 'mobile-main',
    },
    {
      key: 'board',
      get label() {
        return translateLabel('loc.symphony.labels.board.4816cbf');
      },
      icon: 'board',
      route: '/board',
      order: 20,
      region: 'mobile-main',
    },
  ]);
}
