// #region Imports

import type { IWorkspaceAgentView } from '../workspace-organization';
import type { ModelIntelligenceDto } from '@symphony/ipc-contracts-ai';
import { agentIntelligenceIndex } from './agentIntelligenceIndex';

// #endregion

/**
 * Combined index of the chained agents: the enabled agents' scores added up. Agents without
 * a known score contribute nothing; when no agent is scored there is no total to show.
 */
export function teamIntelligenceTotal(
  agents: readonly Pick<IWorkspaceAgentView, 'model' | 'reasoningEffort' | 'enabled'>[],
  scores: ModelIntelligenceDto['scores'],
): number | null {
  const scored = agents
    .filter((agent) => agent.enabled)
    .map((agent) => agentIntelligenceIndex(agent, scores))
    .filter((value): value is number => value !== null);
  if (!scored.length) return null;
  return scored.reduce((total, value) => total + value, 0);
}
