// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { CI_CONTEXT } from '../ports/CiContextToken';
import { countFailingWorkflows } from './countFailingWorkflows';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
    items: () => {
      const context = inject(CI_CONTEXT);
      const projection = inject(ApplicationProjection);
      return {
        key: 'actions',
        get label() {
          return translateLabel('loc.symphony.labels.actions.ff8059d');
        },
        icon: 'executionOutline',
        route: '/main/actions',
        order,
        region: 'desktop-main',
        get group() {
          return translateLabel('loc.symphony.labels.delivery.52bfe58');
        },
        countTone: 'attention',
        count: () =>
          countFailingWorkflows({
            runs: context.runs(),
            localExecutions: projection.snapshot()?.localCiExecutions ?? [],
            workflows: context.workflows(),
          }) || undefined,
      };
    },
  });
}
