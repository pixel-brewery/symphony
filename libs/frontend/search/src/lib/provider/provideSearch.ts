// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, type IFeature } from '@symphony/frontend-core';
import { SearchManager } from '../services/SearchManager';
import type { SearchFeatureKind } from './SearchFeatureKind';

// #endregion

/**
 * Composes the existing global search from the selected feature contributions.
 *
 * @param features - Search contributions included by the application.
 * @returns Search routing and the contributed feature implementations.
 * @public
 */
export function provideSearch(
  ...features: readonly IFeature<SearchFeatureKind>[]
): EnvironmentProviders {
  return makeEnvironmentProviders(composeProviders([SearchManager], features));
}
