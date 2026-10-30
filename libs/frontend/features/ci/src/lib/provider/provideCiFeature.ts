// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { CI_OPERATIONS, ORCHESTRATION_CLIENT, composeProviders } from '@symphony/frontend-core';
import { CiSnapshotContext } from '../adapters/CiSnapshotContext';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { APPLICATION_BOOTSTRAP_CI } from '@symphony/frontend-core/bootstrap';
import type { ICiProjection } from '../ports/ICiProjection';
import { CI_CLIENT } from '../ports/CiClientToken';
import { CI_CONTEXT } from '../ports/CiContextToken';
import { CI_PROJECTION } from '../ports/CiProjectionToken';
import { CiStore } from '../state/CiStore';
import { CI_SETTINGS_CONTEXT } from '../ports/CiSettingsContextToken';
import { CI_SETTINGS_CONFIGURATION } from '../ports/CiSettingsConfigurationToken';
import type { ICiSettingsContext } from '../ports/ICiSettingsContext';
import type { ICiSettingsConfiguration } from '../ports/ICiSettingsConfiguration';
import { withCiSettings } from './withCiSettings';
import { createCiContext } from './createCiContext';
import { CI_USAGE_CONTEXT } from '../ports/CiUsageContextToken';
import type { ICiUsageContext } from '../ports/ICiUsageContext';
import type { ICiActionContext } from '../ports/ICiActionContext';
import { CI_ACTION_CONTEXT } from '../ports/CiActionContextToken';
import { withCiNavigation } from './withCiNavigation';
import { withCiSearch } from './withCiSearch';
import { withCiWidgets } from './withCiWidgets';

// #endregion

/**
 * Registers the single CI state owner with bounded transport and aggregate projection ports.
 *
 * @returns Application-level providers for the optional CI feature.
 * @public
 */
export function provideCiFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [
        CiStore,
        CiSnapshotContext,
        {
          provide: CI_SETTINGS_CONTEXT,
          useFactory: (): ICiSettingsContext => inject(ConfigurationStore),
        },
        {
          provide: CI_SETTINGS_CONFIGURATION,
          useFactory: (): ICiSettingsConfiguration => inject(ConfigurationStore),
        },
        {
          provide: CI_ACTION_CONTEXT,
          useFactory: (): ICiActionContext => inject(ApplicationProjection),
        },
        { provide: CI_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: CI_CONTEXT, useFactory: createCiContext },
        {
          provide: CI_USAGE_CONTEXT,
          useFactory: (): ICiUsageContext => inject(ApplicationProjection),
        },
        { provide: CI_PROJECTION, useFactory: (): ICiProjection => inject(CiSnapshotContext) },
        { provide: CI_OPERATIONS, useExisting: CiStore },
        { provide: APPLICATION_BOOTSTRAP_CI, useExisting: CiStore },
        ...[withCiNavigation(50), withCiSearch(), withCiWidgets()].flatMap((feature) =>
          feature.provide(),
        ),
      ],
      withCiSettings(),
    ),
  );
}
