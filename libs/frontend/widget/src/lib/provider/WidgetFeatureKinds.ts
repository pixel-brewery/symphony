// #region Imports

import { createFeatureKind } from '@symphony/frontend-core';
import type { WidgetFeatureKind } from './WidgetFeatureKind';

// #endregion

/** Branded categories used by explicit widget composition. @public */
export const WidgetFeatureKinds = { Item: createFeatureKind<WidgetFeatureKind>('item') } as const;
