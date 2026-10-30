// #region Imports

import type { FeatureKind } from './FeatureKind';

// #endregion

/**
 * Brands a literal category name for typed frontend feature composition.
 *
 * @param name - Stable contribution category name.
 * @returns The branded category name.
 * @public
 */
export function createFeatureKind<TKind extends string>(name: TKind): FeatureKind<TKind> {
  return name as FeatureKind<TKind>;
}
