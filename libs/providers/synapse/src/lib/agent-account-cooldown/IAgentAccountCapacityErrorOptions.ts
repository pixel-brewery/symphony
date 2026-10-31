// #region Imports

import type { AgentAccountCooldownReason } from '@symphony/domain-ai';

// #endregion

export interface IAgentAccountCapacityErrorOptions extends ErrorOptions {
  readonly reason: AgentAccountCooldownReason;
  readonly retryAt?: string;
}
