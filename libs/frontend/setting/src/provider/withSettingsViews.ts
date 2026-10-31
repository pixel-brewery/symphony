// #region Imports

import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { ISettingsViewContribution } from '../models/ISettingsViewContribution';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { SettingsFeatureKinds } from './SettingsFeatureKinds';
import { SETTINGS_VIEW_CONTRIBUTIONS } from './SettingsViewContributionsToken';

// #endregion

/**
 * Contributes feature-owned cards and section metadata through the native Mosaik host.
 *
 * @param contribution - Explicit cards registered by one included feature.
 * @returns The validated Core-kernel Settings contribution.
 * @public
 */
export function withSettingsViews(
  contribution: ISettingsViewContribution,
): IFeature<SettingsFeatureKind> {
  return createFeature(
    contribution.id,
    SettingsFeatureKinds.View,
    [{ provide: SETTINGS_VIEW_CONTRIBUTIONS, useValue: contribution, multi: true }],
    { multi: true },
  );
}
