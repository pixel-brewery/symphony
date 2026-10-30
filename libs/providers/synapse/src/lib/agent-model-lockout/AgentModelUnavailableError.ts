export class AgentModelUnavailableError extends Error {
  // #region Ctor

  public constructor(
    public readonly targetLabel: string,
    public readonly model: string,
    reason?: string,
  ) {
    super(`${targetLabel} cannot use configured model ${model}.${reason ? ` ${reason}` : ''}`);
    this.name = 'AgentModelUnavailableError';
  }

  // #endregion
}
