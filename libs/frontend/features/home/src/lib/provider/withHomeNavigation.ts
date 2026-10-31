// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { InboxStore } from '../state/InboxStore';

// #endregion

/**
 * Contributes Overview, Inbox and Orbit to the desktop navigation. Overview leads the sidebar;
 * Inbox opens the `Delivery` group with the number of decisions waiting, and Orbit closes it.
 *
 * @param order - Position of Overview; Inbox follows at `order + 10` and Orbit at `order + 45`.
 * @returns The Home feature's navigation contribution.
 * @public
 */
export function withHomeNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'home-navigation',
    items: () => {
      const inbox = inject(InboxStore);
      return [
        {
          key: 'home',
          label: 'Overview',
          icon: 'homeOutline',
          route: '/main/home',
          order,
          region: 'desktop-main',
        },
        {
          key: 'inbox',
          label: 'Inbox',
          icon: 'info',
          route: '/main/inbox',
          order: order + 10,
          region: 'desktop-main',
          group: 'Delivery',
          countTone: 'attention',
          // Hidden while the snapshot loads and when nothing waits, never a misleading zero.
          count: () => inbox.decisionCount() || undefined,
        },
        {
          key: 'orbit',
          label: 'Orbit',
          icon: 'flow',
          route: '/main/orbit',
          order: order + 45,
          region: 'desktop-main',
          group: 'Delivery',
        },
      ];
    },
  });
}
