// #region Imports

import type { Provider } from '@angular/core';
import type { IFeature } from './IFeature';
import type { IFeatureIncompatibilityRule } from './IFeatureIncompatibilityRule';
import { validateFeatures } from './validateFeatures';

// #endregion

/**
 * Composes a capability's base providers with its validated frontend contributions.
 *
 * @param base - Base registrations placed before feature contributions.
 * @param features - Contributions in their deliberate registration order.
 * @param rules - Capability-owned composition incompatibilities.
 * @returns Base providers followed by the validated feature providers.
 * @throws An Error when a registration or incompatibility rule rejects composition.
 * @public
 */
export function composeProviders<TKind extends string>(
  base: ReadonlyArray<Provider>,
  features: ReadonlyArray<IFeature<TKind>>,
  rules: ReadonlyArray<IFeatureIncompatibilityRule<TKind>> = [],
): Provider[] {
  validateFeatures(features, rules);
  return [...base, ...features.flatMap((feature) => feature.provide())];
}
