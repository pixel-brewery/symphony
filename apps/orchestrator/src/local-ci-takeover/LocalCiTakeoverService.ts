// #region Imports

import type { IContinuousIntegrationPort } from '@symphony/application-ci';
import type { ICiRun, ILocalCiExecution } from '@symphony/domain-ci';

// #endregion

/** Claims GitHub jobs that explicitly request an enabled Symphony-managed local runner. */
export class LocalCiTakeoverService {
  // #region Fields

  private _reconciliation?: Promise<void>;
  private _activeStart?: Promise<void>;

  // #endregion

  // #region Ctor

  /**
   * @public
   */
  public constructor(
    private readonly _continuousIntegration: IContinuousIntegrationPort,
    private readonly _localRunActive: () => boolean,
    private readonly _localExecutions: () => readonly ILocalCiExecution[],
    private readonly _startLocalRun: (run: ICiRun) => Promise<ILocalCiExecution>,
    private readonly _reportFailure: (cause: unknown) => void,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Starts at most one previously unhandled managed-local run without waiting for it to finish.
   *
   * @public
   */
  public reconcile(): Promise<void> {
    if (this._reconciliation) return this._reconciliation;
    const reconciliation = this.reconcileOnce().finally(() => {
      if (this._reconciliation === reconciliation) this._reconciliation = undefined;
    });
    this._reconciliation = reconciliation;
    return reconciliation;
  }

  private async reconcileOnce(): Promise<void> {
    if (this._activeStart || this._localRunActive()) return;
    const listCandidates = this._continuousIntegration.listManagedLocalRunCandidates;
    if (!listCandidates) return;
    const candidates = await listCandidates.call(this._continuousIntegration);
    const executions = this._localExecutions();
    const candidate = candidates.find((run) => {
      const candidateAttempt = run.runAttempt ?? 1;
      return !executions.some(
        (execution) =>
          execution.ciRunId === run.id && (execution.runAttempt ?? 1) === candidateAttempt,
      );
    });
    if (!candidate || this._activeStart || this._localRunActive()) return;
    const activeStart = this._startLocalRun(candidate)
      .then(() => undefined)
      .catch((cause: unknown) => this._reportFailure(cause))
      .finally(() => {
        if (this._activeStart === activeStart) this._activeStart = undefined;
      });
    this._activeStart = activeStart;
  }

  // #endregion
}
