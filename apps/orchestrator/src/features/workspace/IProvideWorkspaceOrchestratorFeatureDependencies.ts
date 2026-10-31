// #region Imports
import { type AnalyzerService } from '@symphony/application-execution';
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { type SkillCatalogService } from '@symphony/application-skills';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type JsonWorkspaceBundleRepository } from '@symphony/persistence-workspace';
import { type WorkItemService } from '@symphony/application-work';
import { type RepositoryRuntimeService } from '@symphony/application-workspace';
import { type IStorageWriteAdmission } from '../../storage-governor/IStorageWriteAdmission';
// #endregion

/**
 * Consumes only the capabilities required by workspace orchestration.
 *
 * @public
 */
export interface IProvideWorkspaceOrchestratorFeatureDependencies {
  readonly service: Pick<
    AnalyzerService,
    | 'clearWorkspaces'
    | 'activeExecutionRecords'
    | 'cleanupEligibleWorkspaces'
    | 'drainExecutionQueue'
  >;
  readonly deleteWorkspace: (workspaceId: string) => Promise<IApplicationSettings>;
  readonly skillPackages: Pick<SkillCatalogService, 'sharedPackages' | 'validate' | 'save'>;
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'repositoryPath' | 'save'>;
  readonly workspaceBundles: Pick<JsonWorkspaceBundleRepository, 'write' | 'read'>;
  readonly deletingWorkspaceIds: () => ReadonlySet<string>;
  readonly workItemService: Pick<WorkItemService, 'hasActiveDraftForWorkspace'>;
  readonly normalizeMachinePaths: (input: IApplicationSettings) => IApplicationSettings;
  readonly ensureWorkspaceRoot: (root: string) => void;
  readonly synchronizeRemoteAutomation: (force: boolean) => Promise<void>;
  readonly synchronizeFeedbackIntake: (force: boolean) => Promise<void>;
  readonly runAutonomousCycle: (force: boolean) => Promise<void>;
  readonly repositoryRuntime: Pick<
    RepositoryRuntimeService,
    'statuses' | 'prepare' | 'grantAgentTrust' | 'revokeTrust'
  >;
  readonly storageGovernor: IStorageWriteAdmission;
  readonly workspaceIdForRepository: (repositoryBindingId: string) => string | undefined;
}
