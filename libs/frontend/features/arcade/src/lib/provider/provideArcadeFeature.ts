// #region Imports

import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { provideViewSlotFrom } from '@pixel-brewery/mosaik-elements-angular';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { composeProviders } from '@symphony/frontend-core';
import { withArcadeNavigation } from './withArcadeNavigation';
import { withArcadeSearch } from './withArcadeSearch';
import { SettingsViewSlot } from '@symphony/frontend-setting';
import { ArcadeGodModeStore } from '../god-mode/ArcadeGodModeStore';
import { ARCADE_GOD_MODE_STATE } from '../god-mode/ArcadeGodModeStateToken';
import { ARCADE_SETTINGS_CONTEXT } from '../settings/ArcadeSettingsContextToken';
import { ArcadeSettingsViewSlotProvider } from '../settings/ArcadeSettingsViewSlotProvider';
import { createArcadeSettingsContext } from '../settings/createArcadeSettingsContext';

// #endregion

/**
 * Provides Arcade's optional settings contribution and owned renderer-session lifecycle.
 *
 * @returns The Arcade registrations for the application composition root.
 * @public
 */
export function provideArcadeFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [
        ArcadeGodModeStore,
        { provide: ARCADE_GOD_MODE_STATE, useExisting: ArcadeGodModeStore },
        {
          provide: ARCADE_SETTINGS_CONTEXT,
          useFactory: () => createArcadeSettingsContext(inject(ConfigurationStore)),
        },
      ],
      [withArcadeNavigation(60), withArcadeSearch()],
    ),
    provideAppInitializer(() => inject(ArcadeGodModeStore).initialize()),
    provideViewSlotFrom(SettingsViewSlot.Appearance, ArcadeSettingsViewSlotProvider),
  ]);
}
