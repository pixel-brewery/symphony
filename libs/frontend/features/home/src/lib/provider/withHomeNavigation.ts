// #region Imports

import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';

// #endregion

/**
 * Contributes Overview and Orbit to the desktop navigation.
 *
 * @param order - Position of Overview, with Orbit immediately following it.
 * @returns The Home feature's navigation contribution.
 * @public
 */
export function withHomeNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'home-navigation',
    items: [
      {
        key: 'home',
        label: 'Overview',
        icon: 'homeOutline',
        route: '/main/home',
        order,
        region: 'desktop-main',
      },
      {
        key: 'orbit',
        label: 'Orbit',
        icon: 'weatherSunny',
        route: '/main/orbit',
        order: order + 1,
        region: 'desktop-main',
      },
    ],
  });
}
