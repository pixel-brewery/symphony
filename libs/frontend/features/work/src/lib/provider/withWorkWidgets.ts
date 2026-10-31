// #region Imports

import { inject } from '@angular/core';
import type { IFeature } from '@symphony/frontend-core';
import {
  withWidgetItems,
  SmallFirstWidgetPlacements,
  type WidgetFeatureKind,
} from '@symphony/frontend-widget';
import { WorkWidgetSource } from '../widgets/WorkWidgetSource';
import { WorkHomeWidgetView } from '../widgets/views/WorkHomeWidgetView';

// #endregion

/** Contributes Board's existing category data, fixed geometry and native view. @public */
export function withWorkWidgets(): IFeature<WidgetFeatureKind> {
  return withWidgetItems({
    id: 'work-home-widgets',
    widgets: [
      () => ({
        id: 'board',
        order: 10,
        label: 'Board',
        testId: 'home-category-board',
        tilesTestId: 'home-column-widgets',
        empty: 'Connect a workspace whose board has columns to see them here.',
        tiles: inject(WorkWidgetSource).tiles,
        placements: SmallFirstWidgetPlacements,
        component: WorkHomeWidgetView,
      }),
    ],
  });
}
