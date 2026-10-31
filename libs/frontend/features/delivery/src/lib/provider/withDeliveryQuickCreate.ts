// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withQuickCreateItems, type QuickCreateFeatureKind } from '@symphony/frontend-quick-create';
import { DeliveryQuickCreateSource } from '../quick-create/DeliveryQuickCreateSource';

// #endregion

/** Contributes the existing delivery authoring action. @public */
export function withDeliveryQuickCreate(): IFeature<QuickCreateFeatureKind> {
  return withQuickCreateItems({
    id: 'delivery-quick-create',
    sources: [DeliveryQuickCreateSource],
  });
}
