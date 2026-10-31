// #region Imports

import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';

// #endregion

/**
 * Contributes the CI feature’s Actions destination to the desktop navigation.
 *
 * @param order - Position of the Actions destination.
 * @returns The CI feature’s independently selectable navigation contribution.
 * @public
 */
export function withCiNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'ci-navigation',
    items: {
      key: 'actions',
      label: 'Actions',
      icon: 'executionOutline',
      route: '/main/actions',
      order,
      region: 'desktop-main',
    },
  });
}
