// #region Imports

import type { EnvironmentProviders } from '@angular/core';
import { provideNavigationItems } from '@symphony/frontend-core/mobile';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export function provideMobileDeliveryNavigation(): EnvironmentProviders {
  return provideNavigationItems({
    key: 'pull-requests',
    get label() {
      return translateLabel('loc.symphony.labels.pull.b66d044');
    },
    icon: 'mergeRequests',
    route: '/pull-requests',
    order: 30,
    region: 'mobile-main',
  });
}
