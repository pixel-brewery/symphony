// #region Imports

import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';

// #endregion

/**
 * Contributes pull requests to the desktop navigation.
 *
 * @param order - Position of the Pull Requests destination.
 * @returns The Delivery feature's navigation contribution.
 * @public
 */
export function withDeliveryNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'delivery-navigation',
    items: {
      key: 'pull-requests',
      label: 'Pull Requests',
      icon: 'branch',
      route: '/main/pull-requests',
      order,
      region: 'desktop-main',
    },
  });
}
