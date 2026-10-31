// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';

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
    items: () => {
      const context = inject(DELIVERY_VIEW_CONTEXT);
      return {
        key: 'pull-requests',
        label: 'Pull requests',
        icon: 'branch',
        route: '/main/pull-requests',
        order,
        region: 'desktop-main',
        group: 'Delivery',
        countTone: 'quiet',
        count: () => {
          const pullRequests = context.snapshot()?.pullRequests;
          if (!pullRequests) return undefined;
          return (
            pullRequests.filter((pullRequest) => pullRequest.state === 'open').length || undefined
          );
        },
      };
    },
  });
}
