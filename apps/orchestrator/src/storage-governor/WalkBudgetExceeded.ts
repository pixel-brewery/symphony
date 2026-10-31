export class WalkBudgetExceeded extends Error {
  // #region Ctor

  public constructor() {
    super('Storage walk exceeded its inline entry budget.');
  }

  // #endregion
}
