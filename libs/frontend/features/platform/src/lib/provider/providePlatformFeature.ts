// #region Imports

import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { composeProviders, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import { APPLICATION_BOOTSTRAP_PLATFORM } from '@symphony/frontend-core/bootstrap';
import { PLATFORM_CLIENT } from '../ports/PlatformClientToken';
import { PLATFORM_HEALTH_PROJECTION } from '../ports/PlatformHealthProjectionToken';
import { PLATFORM_SETTINGS_CONTEXT } from '../ports/PlatformSettingsContextToken';
import { PlatformStore } from '../state/PlatformStore';
import { PlatformContext } from '../adapters/PlatformContext';
import { AppearanceSettingsStore } from '../state/AppearanceSettingsStore';
import { DesktopThemeStore } from '../theme/DesktopThemeStore';
import { withPlatformSettings } from './withPlatformSettings';

// #endregion

/**
 * Registers native tool state, appearance synchronization and lazy Settings cards.
 *
 * @public
 */
export function providePlatformFeature(): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...composeProviders(
      [
        PlatformStore,
        AppearanceSettingsStore,
        DesktopThemeStore,
        PlatformContext,
        { provide: PLATFORM_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: PLATFORM_HEALTH_PROJECTION, useExisting: PlatformContext },
        { provide: PLATFORM_SETTINGS_CONTEXT, useExisting: PlatformContext },
        { provide: PLATFORM_OPERATIONS, useExisting: PlatformStore },
        { provide: APPLICATION_BOOTSTRAP_PLATFORM, useExisting: PlatformStore },
      ],
      withPlatformSettings(),
    ),
    provideAppInitializer(() => {
      inject(DesktopThemeStore);
    }),
  ]);
}
