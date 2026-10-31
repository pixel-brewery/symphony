// #region Imports
import { type OrchestratorSettingsState } from './OrchestratorSettingsState';
import { type WorkItemService } from '@symphony/application-work';
import { type AnalyzerService } from '@symphony/application-execution';
import {
  type WorkspaceOperationalRepositories,
  type WorkspaceRuntimeRepositories,
} from '@symphony/persistence-composition';
import {
  type AgentAccountCooldowns,
  type AgentRouteGovernor,
  type AgentModelLockout,
} from '@symphony/providers-synapse';
import { type SqliteRemoteProjectionCache } from '@symphony/persistence-platform';
import { type WorkspaceDatabaseRegistry } from '@symphony/persistence-core';
import { type IApplicationSettings } from '@symphony/configuration-composition';
// #endregion

/**
 * Consumes only the capabilities required by workspaceDeletion orchestration.
 *
 * @public
 */
export interface ICreateWorkspaceDeletionCoordinatorDependencies {
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly workItemService: Pick<WorkItemService, 'hasActiveDraftForWorkspace'>;
  readonly service: Pick<AnalyzerService, 'clearWorkspace'>;
  readonly operationalRepositories: Pick<WorkspaceOperationalRepositories, 'removeWorkspaceData'>;
  readonly agentAccountCooldowns: Pick<AgentAccountCooldowns, 'clearWorkspace'>;
  readonly agentRouteGovernor: Pick<AgentRouteGovernor, 'removeWorkspace'>;
  readonly agentModelLockout: Pick<AgentModelLockout, 'clearWorkspace'>;
  readonly runtimeRepositories: Pick<WorkspaceRuntimeRepositories, 'removeWorkspace'>;
  readonly remoteProjectionCache: Pick<SqliteRemoteProjectionCache, 'removeWorkspace'>;
  readonly workspaceDatabases: Pick<WorkspaceDatabaseRegistry, 'closeWorkspace'>;
  readonly workspaceStoragePaths: (
    sourceSettings: IApplicationSettings,
    workspaceId: string,
  ) => readonly string[];
  readonly normalizeMachinePaths: (input: IApplicationSettings) => IApplicationSettings;
  readonly ensureWorkspaceRoot: (root: string) => void;
  readonly synchronizeRemoteAutomation: (force: boolean) => Promise<void>;
  readonly synchronizeFeedbackIntake: (force: boolean) => Promise<void>;
  readonly runAutonomousCycle: (force: boolean) => Promise<void>;
}
