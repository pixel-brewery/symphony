// #region Imports

import { createFeatureKind } from '@symphony/frontend-core';
import type { SearchFeatureKind } from './SearchFeatureKind';

// #endregion

/**
 * Branded categories used when composing feature-owned search providers.
 *
 * @public
 */
export const SearchFeatureKinds = {
  Provider: createFeatureKind<SearchFeatureKind>('provider'),
} as const;
