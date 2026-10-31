// #region Imports

import { AgentInterruptionError } from './AgentInterruptionError';
import type { IAgentInterruptionErrorOptions } from './IAgentInterruptionErrorOptions';

// #endregion

export class AgentContinuationUnavailableError extends AgentInterruptionError {
  // #region Ctor

  public constructor(message: string, options: IAgentInterruptionErrorOptions = {}) {
    super(message, options);
    this.name = 'AgentContinuationUnavailableError';
  }

  // #endregion
}
