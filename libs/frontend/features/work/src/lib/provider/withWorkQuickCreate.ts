// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import { withQuickCreateItems, type QuickCreateFeatureKind } from '@symphony/frontend-quick-create';
import { WorkQuickCreateSource } from '../quick-create/WorkQuickCreateSource';

// #endregion

/** Contributes the existing work authoring action. @public */
export function withWorkQuickCreate(): IFeature<QuickCreateFeatureKind> {
  return withQuickCreateItems({ id: 'work-quick-create', sources: [WorkQuickCreateSource] });
}
