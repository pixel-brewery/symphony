// #region Imports

import { inject } from '@angular/core';
import type { IFeature } from '@symphony/frontend-core';
import {
  withWidgetItems,
  LargeFirstWidgetPlacements,
  type WidgetFeatureKind,
} from '@symphony/frontend-widget';
import { DeliveryWidgetSource } from '../widgets/DeliveryWidgetSource';
import { DeliveryHomeWidgetView } from '../widgets/views/DeliveryHomeWidgetView';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Contributes Pull requests's existing category data, fixed geometry and native view. @public */
export function withDeliveryWidgets(): IFeature<WidgetFeatureKind> {
  return withWidgetItems({
    id: 'delivery-home-widgets',
    widgets: [
      () => ({
        id: 'pull-requests',
        order: 20,
        get label() {
          return translateLabel('loc.symphony.labels.pull.requests.d9e3f26');
        },
        testId: 'home-category-pull-requests',
        tilesTestId: 'home-pull-request-widgets',
        empty: 'No pull request in the selected workspaces yet.',
        tiles: inject(DeliveryWidgetSource).tiles,
        placements: LargeFirstWidgetPlacements,
        component: DeliveryHomeWidgetView,
      }),
    ],
  });
}
