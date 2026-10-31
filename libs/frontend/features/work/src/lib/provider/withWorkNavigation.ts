// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { WORK_WIDGET_CONTEXT } from '../ports/WorkWidgetContextToken';
import { WorkWidgetSource } from '../widgets/WorkWidgetSource';

// #endregion

/**
 * Contributes the work board to the desktop navigation, counting the work items that need the
 * user.
 *
 * @param order - Position of the Board destination.
 * @returns The Work feature's navigation contribution.
 * @public
 */
export function withWorkNavigation(order: number): IFeature<NavigationFeatureKind> {
  return withNavigationItems({
    id: 'work-navigation',
    items: () => {
      const context = inject(WORK_WIDGET_CONTEXT);
      const source = inject(WorkWidgetSource);
      return [
        {
          key: 'board',
          label: 'Board',
          icon: 'board',
          route: '/main/board',
          order,
          region: 'desktop-main',
          group: 'Delivery',
          countTone: 'quiet',
          count: () => (context.snapshot() ? source.attentionCount() || undefined : undefined),
        },
        {
          key: 'setup',
          label: 'Set up a project',
          icon: 'add',
          route: '/main/setup',
          region: 'workspace-menu',
          order: 10,
        },
      ];
    },
  });
}
