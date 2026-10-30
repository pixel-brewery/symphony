// #region Imports

import type { AgentAccountCooldownReason } from '@symphony/domain-ai';
import { AgentInterruptionError } from '@symphony/application-ai';

// #endregion

export class AgentAccountCoolingDownError extends AgentInterruptionError {
  // #region Fields

  /**
   * The retry at.
   *
   * @public
   * @readonly
   */
  public override readonly retryAt: string;

  // #endregion

  // #region Ctor

  public constructor(
    public readonly targetLabel: string,
    public readonly reason: AgentAccountCooldownReason,
    retryAt: string,
  ) {
    super(
      `${targetLabel} is unavailable because its account is ${reason === 'quota-exhausted' ? 'out of quota' : 'rate limited'} until ${retryAt}.`,
      {
        retryAt,
        recoveryMessage:
          reason === 'quota-exhausted'
            ? 'Every eligible AI account is out of quota. Symphony will resume at the earliest retry window or when you reconnect an account.'
            : 'Every eligible AI account is rate limited. Symphony will resume at the earliest retry window.',
      },
    );
    this.name = 'AgentAccountCoolingDownError';
    this.retryAt = retryAt;
  }

  // #endregion
}
