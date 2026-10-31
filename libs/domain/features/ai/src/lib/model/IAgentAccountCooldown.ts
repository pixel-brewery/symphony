// #region Imports

import type { AgentAccountCooldownReason } from './AgentAccountCooldownReason';

// #endregion

export interface IAgentAccountCooldown {
  readonly workspaceId: string;
  readonly aiConnectionId: string;
  readonly reason: AgentAccountCooldownReason;
  readonly observedAt: string;
  readonly retryAt: string;
}
