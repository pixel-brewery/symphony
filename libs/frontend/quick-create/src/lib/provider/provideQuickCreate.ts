// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, type IFeature } from '@symphony/frontend-core';
import { QuickCreateManager } from '../services/QuickCreateManager';
import type { QuickCreateFeatureKind } from './QuickCreateFeatureKind';

// #endregion

/**
 * Composes the actual authoring actions of the included features.
 *
 * @param features - Explicit feature-owned authoring contributions.
 * @returns Contextual action resolution and its contributed sources.
 * @public
 */
export function provideQuickCreate(
  ...features: readonly IFeature<QuickCreateFeatureKind>[]
): EnvironmentProviders {
  return makeEnvironmentProviders(composeProviders([QuickCreateManager], features));
}
