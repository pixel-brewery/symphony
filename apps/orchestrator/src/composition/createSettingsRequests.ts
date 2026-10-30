// #region Imports
import { resolve } from 'node:path';
import { needsSettingsBackgroundSynchronization } from '../settings-background-synchronization/needsSettingsBackgroundSynchronization';
import { type ICreateSettingsRequestsDependencies } from './ICreateSettingsRequestsDependencies';
import { requestSchemas, responseSchemas } from '@symphony/ipc-contracts-composition';
import { createOrchestratorRequestHandler } from '../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns settings commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createSettingsRequests(dependencies: ICreateSettingsRequestsDependencies) {
  const {
    settingsState,
    deletingWorkspaceIds,
    activeLocalCiRuns,
    localCiEnabledWorkspaceIds,
    normalizeMachinePaths,
    ensureWorkspaceRoot,
    agentModelLockout,
    agentAccountCooldowns,
    service,
    synchronizeRemoteAutomation,
    synchronizeFeedbackIntake,
    runAutonomousCycle,
  } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'settings.get',
      requestSchemas['settings.get'],
      responseSchemas['settings.get'],
      async () => {
        return settingsState.current;
      },
    ),
    createOrchestratorRequestHandler(
      'settings.save',
      requestSchemas['settings.save'],
      responseSchemas['settings.save'],
      async (input) => {
        if (deletingWorkspaceIds().size) {
          throw new Error('Wait for workspace deletion to finish before saving settings.');
        }
        if (
          activeLocalCiRuns().size &&
          (localCiEnabledWorkspaceIds(input.settings) !==
            localCiEnabledWorkspaceIds(settingsState.current) ||
            input.settings.localCi.resourcePreset !==
              settingsState.current.localCi.resourcePreset ||
            JSON.stringify(input.settings.localCi.customResources) !==
              JSON.stringify(settingsState.current.localCi.customResources) ||
            input.settings.localCi.storageLimitGiB !==
              settingsState.current.localCi.storageLimitGiB ||
            resolve(input.settings.runtime.workspaceRoot) !==
              resolve(settingsState.current.runtime.workspaceRoot))
        ) {
          throw new Error('Stop the active local CI run before changing its configuration.');
        }
        const nextSettings = normalizeMachinePaths(input.settings);
        const synchronizeBackgroundProviders = needsSettingsBackgroundSynchronization(
          settingsState.current,
          nextSettings,
        );
        const routingWorkspaceIds = new Set([
          ...settingsState.current.workspaces.map((workspace) => workspace.id),
          ...nextSettings.workspaces.map((workspace) => workspace.id),
        ]);
        ensureWorkspaceRoot(nextSettings.runtime.workspaceRoot);
        settingsState.current = settingsState.save(nextSettings);
        agentModelLockout.clear();
        for (const workspaceId of routingWorkspaceIds) {
          agentAccountCooldowns.clearWorkspace(workspaceId);
        }
        void service.cleanupEligibleWorkspaces();
        if (synchronizeBackgroundProviders) {
          void synchronizeRemoteAutomation(true);
          void synchronizeFeedbackIntake(true);
          void runAutonomousCycle(true);
        }
        return settingsState.current;
      },
    ),
  ]);
  return Object.freeze({ handlers });
}
