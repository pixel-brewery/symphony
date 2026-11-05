// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
        get label() {
          return translateLabel('loc.symphony.labels.pull.requests.d9e3f26');
        },
        icon: 'branch',
        route: '/main/pull-requests',
        order,
        region: 'desktop-main',
        get group() {
          return translateLabel('loc.symphony.labels.delivery.52bfe58');
        },
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
