// #region Imports

import { createFeatureKind } from '@symphony/frontend-core';
import type { QuickCreateFeatureKind } from './QuickCreateFeatureKind';

// #endregion

/** Feature-owned contextual authoring contribution categories. @public */
export const QuickCreateFeatureKinds = {
  Source: createFeatureKind<QuickCreateFeatureKind>('source'),
} as const;
