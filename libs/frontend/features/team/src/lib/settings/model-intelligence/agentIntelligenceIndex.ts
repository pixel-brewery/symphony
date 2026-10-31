// #region Imports

import type { IWorkspaceAgentView } from '../workspace-organization';
import type { ModelIntelligenceDto } from '@symphony/ipc-contracts-ai';

// #endregion

/** Score of the agent's preferred model at its configured effort, when the report knows it. */
export function agentIntelligenceIndex(
  agent: Pick<IWorkspaceAgentView, 'model' | 'reasoningEffort'>,
  scores: ModelIntelligenceDto['scores'],
): number | null {
  if (!agent.model) return null;
  const reasoningEffort = agent.reasoningEffort ?? null;
  return (
    scores.find((score) => score.model === agent.model && score.reasoningEffort === reasoningEffort)
      ?.intelligenceIndex ?? null
  );
}
