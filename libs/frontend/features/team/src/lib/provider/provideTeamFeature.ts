// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders } from '@symphony/frontend-core';
import { withTeamSettings } from './withTeamSettings';
import { AI_OPERATIONS } from '@symphony/frontend-core/ai';
import { TEAM_SETTINGS_CONTEXT } from '../ports/TeamSettingsContextToken';
import { createTeamSettingsContext } from './createTeamSettingsContext';
import { TEAM_CONFIGURATION, type ITeamConfiguration } from '@symphony/frontend-core/team';
import { synchronizeWorkspaceTeamConfiguration } from '../configuration/synchronizeWorkspaceTeamConfiguration';
import { createTeamConfigurationContext } from './createTeamConfigurationContext';

// #endregion

/** Composes the existing workspace team configuration owner. @public */
export function provideTeamFeature(): EnvironmentProviders {
  const configuration: ITeamConfiguration = {
    synchronizeDeliveryContext: synchronizeWorkspaceTeamConfiguration,
  };
  return makeEnvironmentProviders(
    composeProviders(
      [
        { provide: TEAM_CONFIGURATION, useValue: configuration },
        {
          provide: TEAM_SETTINGS_CONTEXT,
          useFactory: () =>
            createTeamSettingsContext(
              createTeamConfigurationContext(),
              inject(AI_OPERATIONS, { optional: true }),
            ),
        },
      ],
      withTeamSettings(),
    ),
  );
}
