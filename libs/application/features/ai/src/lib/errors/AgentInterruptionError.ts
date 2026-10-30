// #region Imports

import type { IAgentInterruptionErrorOptions } from './IAgentInterruptionErrorOptions';

// #endregion

export class AgentInterruptionError extends Error {
  // #region Fields

  /**
   * The retry at.
   *
   * @public
   * @readonly
   */
  public readonly retryAt?: string;

  /**
   * The recovery message.
   *
   * @public
   * @readonly
   */
  public readonly recoveryMessage?: string;

  // #endregion

  // #region Ctor

  public constructor(message: string, options: IAgentInterruptionErrorOptions = {}) {
    super(message, options);
    this.name = 'AgentInterruptionError';
    this.retryAt = options.retryAt;
    this.recoveryMessage = options.recoveryMessage;
  }

  // #endregion
}
