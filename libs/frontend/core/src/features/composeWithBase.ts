// #region Imports

import type { Provider } from '@angular/core';
import { composeProviders } from './composeProviders';
import type { IFeature } from './IFeature';
import type { IFeatureIncompatibilityRule } from './IFeatureIncompatibilityRule';

// #endregion

/**
 * Composes one base registration with validated frontend feature contributions.
 *
 * @param base - Base provider placed before feature contributions.
 * @param features - Contributions in their deliberate registration order.
 * @param rules - Capability-owned composition incompatibilities.
 * @returns The base provider followed by the validated feature providers.
 * @public
 */
export function composeWithBase<TKind extends string>(
  base: Provider,
  features: ReadonlyArray<IFeature<TKind>>,
  rules: ReadonlyArray<IFeatureIncompatibilityRule<TKind>> = [],
): Provider[] {
  return composeProviders([base], features, rules);
}
