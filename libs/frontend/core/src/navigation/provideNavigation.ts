// #region Imports

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders } from '../features/composeProviders';
import type { IFeature } from '../features/IFeature';
import type { NavigationFeatureKind } from './NavigationFeatureKind';
import { NavigationRegistry } from './NavigationRegistry';

// #endregion

/**
 * Provides the existing navigation registry with validated feature contributions.
 *
 * @param features - Explicitly included navigation contributions.
 * @returns Registry and destination registrations for the application injector.
 * @throws An Error when navigation contribution identifiers conflict.
 * @public
 */
export function provideNavigation(
  ...features: ReadonlyArray<IFeature<NavigationFeatureKind>>
): EnvironmentProviders {
  return makeEnvironmentProviders(composeProviders([NavigationRegistry], features));
}
