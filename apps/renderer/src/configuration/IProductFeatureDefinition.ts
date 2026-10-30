// #region Imports
import type { EnvironmentProviders, Provider } from '@angular/core';
import type { Routes } from '@angular/router';
// #endregion

/**
 * Selects one product feature's owned providers and lazy routes at application composition time.
 *
 * @public
 */
export interface IProductFeatureDefinition {
  readonly id: string;
  readonly providers: readonly (Provider | EnvironmentProviders)[];
  readonly routes: Routes;
}
