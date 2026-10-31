// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { ARCADE_SETTINGS_CONTEXT } from '../settings/ArcadeSettingsContextToken';

// #endregion

/**
 * Contributes Arcade when its persisted preference enables the destination.
 *
 * @param order - Position of the optional Arcade destination.
 * @returns The Arcade feature's reactive navigation contribution.
 * @public
 */
export function withArcadeNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'arcade-navigation',
    items: () => {
      const context = inject(ARCADE_SETTINGS_CONTEXT);
      return {
        key: 'arcade',
        label: 'Arcade',
        icon: 'games',
        route: '/main/arcade',
        order,
        region: 'desktop-main',
        group: 'More',
        isVisible: () => context.enabled(),
      };
    },
  });
}
