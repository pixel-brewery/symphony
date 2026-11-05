// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { ARCADE_SETTINGS_CONTEXT } from '../settings/ArcadeSettingsContextToken';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
        get label() {
          return translateLabel('loc.symphony.labels.arcade.df79c0f');
        },
        icon: 'games',
        route: '/main/arcade',
        order,
        region: 'desktop-main',
        get group() {
          return translateLabel('loc.symphony.labels.more.d47d7cb');
        },
        isVisible: () => context.enabled(),
      };
    },
  });
}
