// #region Imports
import {
  type SynapseAiService,
  type AgentModelLockout,
  type AgentAccountCooldowns,
} from '@symphony/providers-synapse';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
import { type ArtificialAnalysisModelIntelligence } from '@symphony/providers-artificial-analysis';
import { type StructuredLogger } from '@symphony/logging';
// #endregion

/**
 * Consumes only the capabilities required by ai orchestration.
 *
 * @public
 */
export interface IProvideAiOrchestratorFeatureDependencies {
  readonly synapseAi: Pick<
    SynapseAiService,
    | 'execute'
    | 'codexConfiguration'
    | 'inspect'
    | 'status'
    | 'importOpenCodeCredentials'
    | 'startBrowserLogin'
    | 'loginWithCredential'
    | 'logout'
    | 'waitForLogin'
    | 'completeLogin'
  >;
  readonly settingsState: Pick<OrchestratorSettingsState, 'current' | 'save'>;
  readonly modelIntelligence: Pick<ArtificialAnalysisModelIntelligence, 'scoreModels'>;
  readonly agentModelLockout: Pick<AgentModelLockout, 'clearConnection'>;
  readonly agentAccountCooldowns: Pick<AgentAccountCooldowns, 'clearConnection'>;
  readonly isolatedRuntimeHome: (
    workspaceId: string,
    provider: 'codex' | 'claude' | 'opencode',
    connectionId: string,
  ) => string;
  readonly logger: Pick<StructuredLogger, 'error'>;
}
