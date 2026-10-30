// #region Imports

import { createFeatureKind } from '../features/createFeatureKind';
import type { NavigationFeatureKind } from './NavigationFeatureKind';

// #endregion

/**
 * Branded categories accepted by the navigation capability.
 *
 * @public
 */
export const NavigationFeatureKinds = {
  Item: createFeatureKind<NavigationFeatureKind>('item'),
} as const;
