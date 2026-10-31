// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { CiSearchProvider } from '../search/CiSearchProvider';

// #endregion

/**
 * Contributes the ci feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withCiSearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'ci-search', providers: [CiSearchProvider] });
}
