// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withSearchProviders, type SearchFeatureKind } from '@symphony/frontend-search';
import { DeliverySearchProvider } from '../search/DeliverySearchProvider';

// #endregion

/**
 * Contributes the delivery feature's existing search behavior.
 *
 * @returns Its independently selectable search provider registration.
 * @public
 */
export function withDeliverySearch(): IFeature<SearchFeatureKind> {
  return withSearchProviders({ id: 'delivery-search', providers: [DeliverySearchProvider] });
}
