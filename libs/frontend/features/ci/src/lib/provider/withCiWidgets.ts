// #region Imports

import { inject } from '@angular/core';
import type { IFeature } from '@symphony/frontend-core';
import {
  withWidgetItems,
  LargeFirstWidgetPlacements,
  type WidgetFeatureKind,
} from '@symphony/frontend-widget';
import { CiWidgetSource } from '../widgets/CiWidgetSource';
import { CiHomeWidgetView } from '../widgets/views/CiHomeWidgetView';

// #endregion

/** Contributes Actions's existing category data, fixed geometry and native view. @public */
export function withCiWidgets(): IFeature<WidgetFeatureKind> {
  return withWidgetItems({
    id: 'ci-home-widgets',
    widgets: [
      () => ({
        id: 'actions',
        order: 30,
        label: 'Actions',
        testId: 'home-category-actions',
        tilesTestId: 'home-action-widgets',
        empty: 'No workflow run in the selected workspaces yet.',
        tiles: inject(CiWidgetSource).tiles,
        placements: LargeFirstWidgetPlacements,
        component: CiHomeWidgetView,
      }),
    ],
  });
}
