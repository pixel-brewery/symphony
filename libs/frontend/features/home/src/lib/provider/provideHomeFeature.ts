// #region Imports
import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, INBOX_SUMMARY } from '@symphony/frontend-core';
import { createInboxSummary } from './createInboxSummary';
import { withHomeNavigation } from './withHomeNavigation';
import { withHomeSearch } from './withHomeSearch';
// #endregion

/**
 * Registers Home's navigation and search together with its selected routes.
 *
 * @public
 */
export function provideHomeFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [{ provide: INBOX_SUMMARY, useFactory: createInboxSummary }],
      [withHomeNavigation(10), withHomeSearch()],
    ),
  );
}
