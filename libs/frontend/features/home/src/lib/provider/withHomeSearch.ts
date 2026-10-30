// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { HomeSearchProvider } from '../search/HomeSearchProvider';

// #endregion

/**
 * Contributes the home feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withHomeSearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'home-search', providers: [HomeSearchProvider] });
}
