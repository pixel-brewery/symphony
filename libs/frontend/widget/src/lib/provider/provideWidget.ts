// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { provideViewSlotFrom } from '@pixel-brewery/mosaik-elements-angular';
import { composeProviders, type IFeature } from '@symphony/frontend-core';
import type { WidgetFeatureKind } from './WidgetFeatureKind';
import { WIDGET_VIEW_SLOT } from './WidgetViewSlot';
import { WidgetViewSlotProvider } from './WidgetViewSlotProvider';

// #endregion

/**
 * Composes actual feature widgets through Mosaik's existing view-slot infrastructure.
 *
 * @param features - Widget configuration contributed by the included product features.
 * @returns Native view registration and its feature-owned data dependencies.
 * @public
 */
export function provideWidget(
  ...features: readonly IFeature<WidgetFeatureKind>[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideViewSlotFrom(WIDGET_VIEW_SLOT, WidgetViewSlotProvider),
    ...composeProviders([], features),
  ]);
}
