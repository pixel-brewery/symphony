// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { ArcadeSearchProvider } from '../search/ArcadeSearchProvider';

// #endregion

/**
 * Contributes the arcade feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withArcadeSearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'arcade-search', providers: [ArcadeSearchProvider] });
}
