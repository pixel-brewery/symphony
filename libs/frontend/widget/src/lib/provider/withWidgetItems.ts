// #region Imports

import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';
import type { WidgetFeatureKind } from './WidgetFeatureKind';
import { WidgetFeatureKinds } from './WidgetFeatureKinds';
import { WIDGET_DEFINITIONS } from './WidgetDefinitions';

// #endregion

/**
 * Supplies feature-owned native views and their existing reactive category data.
 *
 * @param options - Unique contribution identity and factories resolved in Angular DI.
 * @returns A widget contribution for the application's explicit composition.
 * @public
 */
export function withWidgetItems(options: {
  readonly id: string;
  readonly widgets: readonly (() => IWidgetDefinition)[];
}): IFeature<WidgetFeatureKind> {
  return createFeature(
    options.id,
    WidgetFeatureKinds.Item,
    options.widgets.map((factory) => ({
      provide: WIDGET_DEFINITIONS,
      useFactory: factory,
      multi: true,
    })),
    { multi: true },
  );
}
