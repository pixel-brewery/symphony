// #region Imports

import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';

// #endregion

/**
 * Contributes the work board to the desktop navigation.
 *
 * @param order - Position of the Board destination.
 * @returns The Work feature's navigation contribution.
 * @public
 */
export function withWorkNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'work-navigation',
    items: [
      {
        key: 'board',
        label: 'Board',
        icon: 'board',
        route: '/main/board',
        order,
        region: 'desktop-main',
      },
      {
        key: 'setup',
        label: 'Set up a project',
        icon: 'add',
        route: '/main/setup',
        region: 'workspace-menu',
        order: 10,
      },
    ],
  });
}
