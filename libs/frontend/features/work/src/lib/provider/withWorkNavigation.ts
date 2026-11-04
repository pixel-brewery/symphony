// #region Imports

import { inject } from '@angular/core';
import {
  withNavigationItems,
  type IFeature,
  type NavigationFeatureKind,
} from '@symphony/frontend-core';
import { WORK_WIDGET_CONTEXT } from '../ports/WorkWidgetContextToken';
import { WorkWidgetSource } from '../widgets/WorkWidgetSource';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
          get label() {
            return translateLabel('loc.symphony.labels.board.4816cbf');
          },
          icon: 'board',
          route: '/main/board',
          order,
          region: 'desktop-main',
          get group() {
            return translateLabel('loc.symphony.labels.delivery.52bfe58');
          },
          countTone: 'quiet',
          count: () => (context.snapshot() ? source.attentionCount() || undefined : undefined),
        },
        {
          key: 'setup',
          get label() {
            return translateLabel('loc.symphony.labels.set.up.a.project.34e60d3');
          },
          icon: 'add',
          route: '/main/setup',
          region: 'workspace-menu',
          order: 10,
        },
      ];
    },
  });
}
