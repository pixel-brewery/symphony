// #region Imports
import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders } from '@symphony/frontend-core';
import { withHomeNavigation } from './withHomeNavigation';
import { withHomeSearch } from './withHomeSearch';
// #endregion

/**
 * Registers Home's navigation and search together with its selected routes.
 *
 * @public
 */
export function provideHomeFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(composeProviders([], [withHomeNavigation(10), withHomeSearch()]));
}
