// #region Imports

import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { ISettingsSearchContribution } from '../search/ISettingsSearchContribution';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { SettingsFeatureKinds } from './SettingsFeatureKinds';
import { SETTINGS_SEARCH_CONTRIBUTIONS } from './SettingsSearchContributionsToken';

// #endregion

/**
 * Adds a feature's data-dependent settings to `Search settings` for a section drawn by another
 * feature, such as one entry per AI account in `Connected services`.
 *
 * @param contribution - The section and the entry factory.
 * @returns The validated Core-kernel Settings contribution.
 * @public
 */
export function withSettingsSearch(
  contribution: ISettingsSearchContribution,
): IFeature<SettingsFeatureKind> {
  return createFeature(
    contribution.id,
    SettingsFeatureKinds.Search,
    [{ provide: SETTINGS_SEARCH_CONTRIBUTIONS, useValue: contribution, multi: true }],
    { multi: true },
  );
}
