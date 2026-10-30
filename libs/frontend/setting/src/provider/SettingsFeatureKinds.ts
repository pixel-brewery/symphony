// #region Imports

import { createFeatureKind } from '@symphony/frontend-core';
import type { SettingsFeatureKind } from './SettingsFeatureKind';

// #endregion

/**
 * Brands Settings contributions for the existing Core composition kernel.
 *
 * @public
 */
export const SettingsFeatureKinds = {
  RouteInitializer: createFeatureKind('route-initializer'),
  View: createFeatureKind<SettingsFeatureKind>('view'),
  Editor: createFeatureKind<SettingsFeatureKind>('editor'),
} as const;
