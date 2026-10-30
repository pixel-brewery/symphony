// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { WorkSearchProvider } from '../search/WorkSearchProvider';

// #endregion

/**
 * Contributes the work feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withWorkSearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'work-search', providers: [WorkSearchProvider] });
}
