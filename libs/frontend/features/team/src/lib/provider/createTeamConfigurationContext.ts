// #region Imports

import { computed, inject, Injector } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { PLATFORM_OPERATIONS } from '@symphony/frontend-core/platform';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import type { ITeamConfigurationContext } from '../ports/ITeamConfigurationContext';

// #endregion

/**
 * Composes Team's settings consumer from the existing writer and optional native-tool owner.
 *
 * @returns Team's bounded configuration and installation capabilities.
 * @public
 */
export function createTeamConfigurationContext(): ITeamConfigurationContext {
  const configuration = inject(ConfigurationStore);
  const projection = inject(ApplicationProjection);
  const injector = inject(Injector);
  return {
    get nativeInstallAvailable() {
      return injector.get(PLATFORM_OPERATIONS, null) !== null;
    },
    settings: configuration.settings,
    configurationBusy: configuration.configurationBusy,
    editorBusy: configuration.editorBusy,
    connections: configuration.connections,
    get runtimeHealth() {
      return injector.get(PLATFORM_OPERATIONS, null)?.runtimeHealth ?? projection.runtimeHealth;
    },
    runtimeDependencyInstallBusy: computed(() =>
      injector.get(PLATFORM_OPERATIONS, null)?.runtimeDependencyInstallBusy(),
    ),
    saveSettings: (settings, message) => configuration.saveSettings(settings, message),
    refreshConfiguration: () => configuration.refreshConfiguration(),
    refreshProviderConnections: () => configuration.refreshProviderConnections(),
    installRuntimeDependency: (command) =>
      injector.get(PLATFORM_OPERATIONS, null)?.installRuntimeDependency(command) ??
      Promise.resolve(false),
  };
}
