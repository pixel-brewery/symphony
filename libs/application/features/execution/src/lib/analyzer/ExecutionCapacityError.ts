/**
 * Raised when a step cannot start because every execution slot is taken.
 *
 * The limit is deliberate, so this is a scheduling outcome and not a fault: callers that own an
 * operator decision translate it into a queue entry, while background callers keep deferring.
 * The message is part of the contract that automation treats as deferrable.
 */
export class ExecutionCapacityError extends Error {
  // #region Ctor

  public constructor(
    public readonly active: number,
    public readonly maximum: number,
  ) {
    super(`Execution capacity is full (${active} active of ${maximum}).`);
    this.name = 'ExecutionCapacityError';
  }

  // #endregion
}
