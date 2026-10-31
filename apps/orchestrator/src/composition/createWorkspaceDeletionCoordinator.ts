// #region Imports
import {
  type IApplicationSettings,
  removeWorkspaceConfiguration,
} from '@symphony/configuration-composition';
import { rmSync } from 'node:fs';
import { type ICreateWorkspaceDeletionCoordinatorDependencies } from './ICreateWorkspaceDeletionCoordinatorDependencies';
// #endregion

/**
 * Owns workspaceDeletion commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createWorkspaceDeletionCoordinator(
  dependencies: ICreateWorkspaceDeletionCoordinatorDependencies,
) {
  const {
    settingsState,
    workItemService,
    service,
    operationalRepositories,
    agentAccountCooldowns,
    agentRouteGovernor,
    agentModelLockout,
    runtimeRepositories,
    remoteProjectionCache,
    workspaceDatabases,
    workspaceStoragePaths,
    normalizeMachinePaths,
    ensureWorkspaceRoot,
    synchronizeRemoteAutomation,
    synchronizeFeedbackIntake,
    runAutonomousCycle,
  } = dependencies;
  const deletingWorkspaceIds = new Set<string>();

  async function deleteWorkspace(workspaceId: string): Promise<IApplicationSettings> {
    if (deletingWorkspaceIds.size) {
      throw new Error('Wait for the current workspace deletion to finish.');
    }
    const currentSettings = settingsState.current;
    const nextSettings = removeWorkspaceConfiguration(currentSettings, workspaceId);
    if (workItemService.hasActiveDraftForWorkspace(workspaceId)) {
      throw new Error(
        'Wait for or cancel the active work-item draft before deleting this workspace.',
      );
    }

    deletingWorkspaceIds.add(workspaceId);
    try {
      const cleanup = await service.clearWorkspace(workspaceId);
      if (cleanup.skipped || cleanup.failed) {
        throw new Error(
          `Workspace deletion stopped because ${cleanup.skipped + cleanup.failed} managed workspace${cleanup.skipped + cleanup.failed === 1 ? '' : 's'} could not be removed.`,
        );
      }

      settingsState.current = nextSettings;
      operationalRepositories.removeWorkspaceData(workspaceId);
      agentAccountCooldowns.clearWorkspace(workspaceId);
      agentRouteGovernor.removeWorkspace(workspaceId);
      agentModelLockout.clearWorkspace(workspaceId);
      runtimeRepositories.removeWorkspace(workspaceId);
      remoteProjectionCache.removeWorkspace(workspaceId);
      workspaceDatabases.closeWorkspace(workspaceId);
      for (const path of workspaceStoragePaths(currentSettings, workspaceId)) {
        rmSync(path, { recursive: true, force: true });
      }
      settingsState.current = settingsState.save(normalizeMachinePaths(nextSettings));
      ensureWorkspaceRoot(settingsState.current.runtime.workspaceRoot);
      void synchronizeRemoteAutomation(true);
      void synchronizeFeedbackIntake(true);
      void runAutonomousCycle(true);
      return settingsState.current;
    } catch (cause) {
      settingsState.current = currentSettings;
      throw cause;
    } finally {
      deletingWorkspaceIds.delete(workspaceId);
    }
  }

  return Object.freeze({
    deleteWorkspace,
    deletingWorkspaceIds: (): ReadonlySet<string> => deletingWorkspaceIds,
  });
}
