// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';

// #endregion

export function provideMobileDeliveryNavigation(): EnvironmentProviders {
  return provideNavigationItems({
    key: 'pull-requests',
    label: 'Pull',
    icon: 'mergeRequests',
    route: '/pull-requests',
    order: 30,
    region: 'mobile-main',
  });
}
