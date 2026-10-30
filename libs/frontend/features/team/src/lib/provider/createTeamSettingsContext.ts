// #region Imports

import { computed } from '@angular/core';
import type { IAiOperations } from '@symphony/frontend-core/ai';
import type { ITeamSettingsContext } from '../ports/ITeamSettingsContext';
import type { ITeamConfigurationContext } from '../ports/ITeamConfigurationContext';

// #endregion

/** Assembles bounded consumed ports without adding another writable state owner. @internal */
export function createTeamSettingsContext(
  environment: ITeamConfigurationContext,
  ai: IAiOperations | null,
): ITeamSettingsContext {
  const unavailable = computed(() => false);
  const absent = computed(() => undefined);
  return {
    aiAvailable: ai !== null,
    nativeInstallAvailable: environment.nativeInstallAvailable,
    settings: environment.settings,
    configurationBusy: environment.configurationBusy,
    editorBusy: environment.editorBusy,
    connections: environment.connections,
    runtimeHealth: environment.runtimeHealth,
    runtimeDependencyInstallBusy: environment.runtimeDependencyInstallBusy,
    codexConfiguration: ai?.codexConfiguration ?? absent,
    codexConfigurationAccountId: ai?.codexConfigurationAccountId ?? absent,
    availableAiModels: ai?.availableAiModels ?? absent,
    modelIntelligence: ai?.modelIntelligence ?? absent,
    codexConfigurationBusy: ai?.codexConfigurationBusy ?? unavailable,
    availableAiModelsBusy: ai?.availableAiModelsBusy ?? unavailable,
    modelIntelligenceBusy: ai?.modelIntelligenceBusy ?? unavailable,
    refreshCodexConfiguration: (account) =>
      ai?.refreshCodexConfiguration(account) ?? Promise.resolve(false),
    clearCodexConfiguration: () => ai?.clearCodexConfiguration(),
    refreshAvailableAiModels: (input) =>
      ai?.refreshAvailableAiModels(input) ?? Promise.resolve(false),
    refreshModelIntelligence: (input) =>
      ai?.refreshModelIntelligence(input) ?? Promise.resolve(false),
    aiUsageFor: (id) => ai?.aiUsageFor(id),
    aiUsageBusyFor: (id) => ai?.aiUsageBusyFor(id) ?? false,
    refreshAiUsage: (input) => ai?.refreshAiUsage(input) ?? Promise.resolve(false),
    saveSettings: (settings, message) => environment.saveSettings(settings, message),
    refreshConfiguration: () => environment.refreshConfiguration(),
    refreshProviderConnections: () => environment.refreshProviderConnections(),
    installRuntimeDependency: (command) => environment.installRuntimeDependency(command),
  };
}
