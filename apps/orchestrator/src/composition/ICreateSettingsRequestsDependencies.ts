// #region Imports
import { type OrchestratorSettingsState } from './OrchestratorSettingsState';
import { type IActiveLocalCiRun } from '../features/ci/IActiveLocalCiRun';
import { type IApplicationSettings } from '@symphony/configuration-composition';
import { type AgentModelLockout, type AgentAccountCooldowns } from '@symphony/providers-synapse';
import { type AnalyzerService } from '@symphony/application-execution';
// #endregion

/**
 * Consumes only the capabilities required by settings orchestration.
 *
 * @public
 */
export interface ICreateSettingsRequestsDependencies {
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly deletingWorkspaceIds: () => ReadonlySet<string>;
  readonly activeLocalCiRuns: () => ReadonlyMap<string, IActiveLocalCiRun>;
  readonly localCiEnabledWorkspaceIds: (input: IApplicationSettings) => string;
  readonly normalizeMachinePaths: (input: IApplicationSettings) => IApplicationSettings;
  readonly ensureWorkspaceRoot: (root: string) => void;
  readonly agentModelLockout: Pick<AgentModelLockout, 'clear'>;
  readonly agentAccountCooldowns: Pick<AgentAccountCooldowns, 'clearWorkspace'>;
  readonly service: Pick<AnalyzerService, 'cleanupEligibleWorkspaces'>;
  readonly synchronizeRemoteAutomation: (force: boolean) => Promise<void>;
  readonly synchronizeFeedbackIntake: (force: boolean) => Promise<void>;
  readonly runAutonomousCycle: (force: boolean) => Promise<void>;
}
