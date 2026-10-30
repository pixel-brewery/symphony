// #region Imports

import type { AgentAccountCooldownReason } from '@symphony/domain-ai';
import { AgentInterruptionError } from '@symphony/application-ai';
import type { IAgentAccountCapacityErrorOptions } from './IAgentAccountCapacityErrorOptions';

// #endregion

export class AgentAccountCapacityError extends AgentInterruptionError {
  // #region Fields

  /**
   * The reason.
   *
   * @public
   * @readonly
   */
  public readonly reason: AgentAccountCooldownReason;

  // #endregion

  // #region Ctor

  public constructor(message: string, options: IAgentAccountCapacityErrorOptions) {
    super(message, {
      ...options,
      recoveryMessage:
        options.reason === 'quota-exhausted'
          ? 'The selected AI account is out of quota. Symphony will resume after its retry window or when you reconnect the account.'
          : 'The selected AI account is rate limited. Symphony will resume after its retry window.',
    });
    this.name = 'AgentAccountCapacityError';
    this.reason = options.reason;
  }

  // #endregion
}
