// #region Imports

import type { ExecutionState, IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItemClaim } from '@symphony/domain-work';
import {
  AgentContinuationUnavailableError,
  AgentInterruptionError,
} from '@symphony/application-ai';
import { waitForRecoveryDelay } from '@symphony/application-core';
import type { IExecutionLifecycle } from './IExecutionLifecycle';
import type { IExecutionLifecycleDependencies } from './IExecutionLifecycleDependencies';

// #endregion

/** Owns live execution tasks, cancellation and recovery. @public */
export class ExecutionLifecycleService implements IExecutionLifecycle {
  // #region Fields

  private readonly _activeExecutions = new Map<
    string,
    { readonly controller: AbortController; readonly completion: Promise<void> }
  >();

  private readonly _pausingExecutions = new Map<string, 'lifecycle' | 'operator'>();

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionLifecycleDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the active execution records.
   *
   * @public
   */
  public activeExecutionRecords(): readonly IExecutionRecord[] {
    const activeIds = new Set(this._activeExecutions.keys());
    return this._dependencies.repository
      .listExecutions()
      .filter((execution) => activeIds.has(execution.id) && this.isActive(execution.state));
  }

  /**
   * Cancels the active executions.
   *
   * @public
   */
  public cancelActiveExecutions(): Promise<readonly IExecutionRecord[]> {
    return this._dependencies.withQueueDrainSuspended(async () => {
      const active = [...this._activeExecutions.entries()];
      if (!active.length) return [];
      for (const [, operation] of active) operation.controller.abort();
      await Promise.allSettled(active.map(([, operation]) => operation.completion));
      const cancelledIds = new Set(active.map(([executionId]) => executionId));
      return this._dependencies.repository
        .listExecutions()
        .filter((execution) => cancelledIds.has(execution.id));
    });
  }

  /**
   * Pauses the active executions.
   *
   * @public
   */
  public pauseActiveExecutions(): Promise<readonly IExecutionRecord[]> {
    return this._dependencies.withQueueDrainSuspended(async () => {
      const active = [...this._activeExecutions.entries()];
      if (!active.length) return [];
      for (const [executionId, operation] of active) {
        this._pausingExecutions.set(executionId, 'lifecycle');
        operation.controller.abort();
      }
      await Promise.allSettled(active.map(([, operation]) => operation.completion));
      const pausedIds = new Set(active.map(([executionId]) => executionId));
      return this._dependencies.repository
        .listExecutions()
        .filter((execution) => pausedIds.has(execution.id));
    });
  }

  /**
   * Pauses the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async pauseExecution(executionId: string): Promise<IExecutionRecord> {
    const execution = this.latestExecution(executionId);
    if (execution.pause?.reason === 'operator') return execution;
    if (!this.isActive(execution.state)) {
      throw new Error(`Execution ${executionId} is already ${execution.state}.`);
    }
    const active = this._activeExecutions.get(executionId);
    if (!active) {
      throw new Error(`Execution ${executionId} is not active in this Symphony session.`);
    }

    this._pausingExecutions.set(executionId, 'operator');
    active.controller.abort();
    await active.completion;
    return this.latestExecution(executionId);
  }

  /**
   * Resumes the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async resumeExecution(executionId: string): Promise<IExecutionRecord> {
    const execution = this.latestExecution(executionId);
    if (!execution.pause || execution.state !== 'waiting') {
      throw new Error(`Execution ${executionId} is not paused.`);
    }
    // A lifecycle pause never released its slot and still counts against capacity, so the
    // operator reactivates it directly. Only an operator pause has to win a slot back, because
    // pausing for the operator is what freed it.
    if (execution.pause.reason === 'lifecycle') {
      if (this._activeExecutions.has(executionId)) return execution;
      return this.reactivatePausedExecution(execution, 'Execution reactivated by the operator.');
    }

    const capacity = this._dependencies.executionCapacity();
    if (capacity.active + this._dependencies.pendingExecutionStarts() >= capacity.maximum) {
      if (execution.pause.resumeRequestedAt) return execution;
      const queued: IExecutionRecord = {
        ...execution,
        pause: {
          ...execution.pause,
          resumeRequestedAt: this._dependencies.clock.now(),
        },
        lastHeartbeatAt: this._dependencies.clock.now(),
      };
      this._dependencies.repository.saveExecution(queued);
      await this._dependencies.record(
        executionId,
        'agent.progress',
        'Execution will resume automatically when an execution slot becomes available.',
        { origin: 'orchestrator', category: 'status' },
      );
      return queued;
    }

    this._dependencies.reserveExecutionCapacity();
    try {
      return await this.reactivatePausedExecution(
        execution,
        'Execution queued for operator-requested reactivation.',
      );
    } finally {
      this._dependencies.releaseExecutionCapacity();
    }
  }

  /**
   * Returns the reconcile active executions.
   *
   * @public
   */
  public reconcileActiveExecutions(): Promise<number> {
    return this._dependencies.withQueueDrainSuspended(async () => {
      if (this._activeExecutions.size > 0) {
        await this.pauseActiveExecutions();
        await Promise.resolve();
      }
      return this.reactivateInterruptedExecutions();
    });
  }

  /**
   * Returns the recover interrupted executions.
   *
   * @public
   */
  public async recoverInterruptedExecutions(): Promise<void> {
    await this.reactivateInterruptedExecutions();
    await this._dependencies.resumeRequestedOperatorExecutions();
    await this._dependencies.drainExecutionQueue();
    const semanticallyFailed = this._dependencies.repository
      .listExecutions()
      .filter(
        (execution) =>
          execution.state === 'succeeded' &&
          this._dependencies.isSemanticFailure(execution.summary),
      );
    for (const execution of semanticallyFailed) {
      const error = execution.summary!;
      this._dependencies.repository.saveExecution({
        ...execution,
        state: 'failed',
        summary: undefined,
        error,
      });
      await this._dependencies.finalizeWorkspace({
        ...execution,
        state: 'failed',
        summary: undefined,
        error,
      });
      await this._dependencies.record(execution.id, 'execution.failed', error);
    }
    await this._dependencies.cleanupEligibleWorkspaces();
  }

  /**
   * Returns the reactivate interrupted executions.
   *
   * @public
   */
  public async reactivateInterruptedExecutions(): Promise<number> {
    const interrupted = this._dependencies.repository
      .listExecutions()
      .filter(
        (execution) =>
          this.isActive(execution.state) &&
          execution.pause?.reason !== 'operator' &&
          !this._activeExecutions.has(execution.id),
      );
    for (const execution of interrupted) {
      await this.reactivatePausedExecution(
        execution,
        'Symphony is reactivating this execution after an interruption.',
      );
    }
    return interrupted.length;
  }

  /**
   * Cancels the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async cancelExecution(executionId: string): Promise<IExecutionRecord> {
    const execution = this._dependencies.repository
      .listExecutions()
      .find((candidate) => candidate.id === executionId);
    if (!execution) throw new Error(`Unknown execution: ${executionId}`);
    if (!this.isActive(execution.state)) {
      throw new Error(`Execution ${executionId} is already ${execution.state}.`);
    }
    const active = this._activeExecutions.get(executionId);
    if (!active) {
      if (execution.pause?.reason === 'operator') {
        await this.finishCancelledExecution(execution);
        return this.latestExecution(executionId);
      }
      throw new Error(`Execution ${executionId} is not active in this Symphony session.`);
    }

    active.controller.abort();
    await active.completion;
    const cancelled = this._dependencies.repository
      .listExecutions()
      .find((candidate) => candidate.id === executionId);
    if (!cancelled) throw new Error(`Execution disappeared after cancellation: ${executionId}`);
    return cancelled;
  }

  private async resumeInterruptedExecution(
    execution: IExecutionRecord,
    signal: AbortSignal,
  ): Promise<void> {
    let current = execution;
    // A distributed claim must be revalidated through the shared tracker after restart.
    // The persisted snapshot remains an offline fallback only for legacy, unclaimed executions.
    let item = execution.workItemClaim ? undefined : execution.workItemSnapshot;
    let trackerResolved = Boolean(item);
    while (!item && !trackerResolved && !signal.aborted) {
      try {
        item = (await this._dependencies.tracker.listWorkItems()).find(
          (candidate) => candidate.id === current.workItemId,
        );
        trackerResolved = true;
      } catch {
        const reactivated = await this.waitForReactivation(
          current,
          new AgentInterruptionError('The tracker is temporarily unavailable.'),
          signal,
        );
        if (!reactivated) {
          await this.finishAbortedExecution(current);
          return;
        }
        current = reactivated;
      }
    }
    if (signal.aborted) {
      await this.finishAbortedExecution(current);
      return;
    }
    if (!item) {
      await this.finishFailedExecution(
        current,
        new Error(`Work item ${current.workItemId} is unavailable for recovery.`),
        'Work item recovery failed.',
      );
      return;
    }
    if (
      !current.workspacePath ||
      !(await this._dependencies.workspace.isAvailable(current.workspacePath))
    ) {
      await this.finishFailedExecution(
        current,
        new Error('The managed workspace required for recovery is unavailable.'),
        'Workspace recovery failed.',
      );
      return;
    }

    const running: IExecutionRecord = {
      ...this.latestExecution(current.id),
      state: 'running',
      pause: undefined,
      workItemSnapshot: item,
      error: undefined,
      finishedAt: undefined,
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(running);
    await this._dependencies.record(
      running.id,
      'agent.progress',
      `Execution reactivated (attempt ${running.attempt ?? 1}).`,
      { origin: 'orchestrator', category: 'status' },
    );

    if (running.skillFlowRole === 'ci-diagnosis') {
      await this._dependencies.completeAgenticDiagnosisInBackground(running, item, false, signal);
      return;
    }
    if (running.kind === undefined || running.kind === 'analysis') {
      await this._dependencies.completeInBackground(running, item, false, signal);
      return;
    }
    const analysis = [...this._dependencies.repository.listExecutions()]
      .filter(
        (candidate) =>
          candidate.workItemId === running.workItemId &&
          (candidate.kind === undefined || candidate.kind === 'analysis') &&
          (running.skillFlowRole === 'ci-repair'
            ? candidate.id === running.parentExecutionId
            : candidate.skillFlowRole === undefined || candidate.skillFlowRole === 'analysis') &&
          candidate.state === 'succeeded' &&
          candidate.summary,
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
    if (!analysis?.summary) {
      await this.finishFailedExecution(
        running,
        new Error('The completed analysis required by this solution is unavailable.'),
        'Solution recovery failed.',
      );
      return;
    }
    await this._dependencies.completeSolutionInBackground(
      running,
      item,
      analysis.summary,
      running.request,
      false,
      signal,
    );
  }

  /** Retains resumable state through an interrupted agent attempt. @public */
  public async waitForReactivation(
    execution: IExecutionRecord,
    cause: AgentInterruptionError,
    signal: AbortSignal,
  ): Promise<IExecutionRecord | undefined> {
    const latest = this.latestExecution(execution.id);
    const waiting: IExecutionRecord = {
      ...latest,
      ...(cause instanceof AgentContinuationUnavailableError
        ? { continuationReference: undefined }
        : {}),
      state: 'waiting',
      attempt: (latest.attempt ?? 1) + 1,
      error: undefined,
      finishedAt: undefined,
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(waiting);
    await this._dependencies.record(
      waiting.id,
      'agent.progress',
      cause instanceof AgentContinuationUnavailableError
        ? 'The saved AI provider session is unavailable. Symphony will continue from the durable workspace.'
        : (cause.recoveryMessage ??
            'The AI agent was interrupted. Symphony will keep reactivating the task until it resumes or you cancel it.'),
      { origin: 'orchestrator', category: 'status' },
    );
    try {
      await this.delayBeforeRecovery(waiting.attempt ?? 1, signal, cause.retryAt);
    } catch {
      return undefined;
    }
    if (signal.aborted) return undefined;
    const running: IExecutionRecord = {
      ...this.latestExecution(waiting.id),
      state: 'running',
      pause: undefined,
      error: undefined,
      finishedAt: undefined,
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(running);
    await this._dependencies.record(
      running.id,
      'agent.progress',
      `Reactivating AI agent (attempt ${running.attempt ?? 1}).`,
      { origin: 'orchestrator', category: 'status' },
    );
    return running;
  }

  private async delayBeforeRecovery(
    attempt: number,
    signal: AbortSignal,
    retryAt?: string,
  ): Promise<void> {
    if (this._dependencies.recoveryDelay) {
      await this._dependencies.recoveryDelay(attempt, signal, retryAt);
      return;
    }
    await waitForRecoveryDelay(attempt, signal, retryAt);
  }

  /** Reads the authoritative durable record for an execution. @public */
  public latestExecution(executionId: string): IExecutionRecord {
    const execution = this._dependencies.repository
      .listExecutions()
      .find((candidate) => candidate.id === executionId);
    if (!execution) throw new Error(`Unknown execution: ${executionId}`);
    return execution;
  }

  /** Records a terminal failure and preserves its recovery evidence. @public */
  public async finishFailedExecution(
    execution: IExecutionRecord,
    cause: unknown,
    fallback: string,
  ): Promise<void> {
    const error = cause instanceof Error ? cause.message : fallback;
    let failed: IExecutionRecord = {
      ...this.latestExecution(execution.id),
      state: 'failed',
      error,
      finishedAt: this._dependencies.clock.now(),
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(failed);
    const failedItem = await this._dependencies.remoteProjectionQueries
      .loadWorkItemDetails(failed.workItemId)
      .catch(() => undefined);
    if (failedItem) {
      await this._dependencies.reportRunResult(
        failedItem,
        failed.kind === 'solution' || failed.kind === 'revision' ? 'solve' : 'analyze',
        failed,
        this._dependencies.isSemanticFailure(error) ? 'rework' : 'retry',
        error,
      );
    }
    const goal = this._dependencies.goalForWorkItem(failed.workItemId);
    if (goal) {
      this._dependencies.recordFailedGoal(goal, failed, error);
    }
    if (
      failed.automationOrigin === 'agentic-delivery' &&
      failed.workItemClaim &&
      !failed.workItemClaim.releasedAt
    ) {
      try {
        await this._dependencies.releaseWorkItemClaim(failed.workItemClaim);
        failed = {
          ...failed,
          workItemClaim: {
            ...failed.workItemClaim,
            releasedAt: this._dependencies.clock.now(),
          },
        };
        this._dependencies.repository.saveExecution(failed);
      } catch {
        failed = {
          ...failed,
          error: `${error} The distributed work-item claim could not be released and requires operator recovery.`,
        };
        this._dependencies.repository.saveExecution(failed);
      }
    }
    await this._dependencies.finalizeWorkspace(failed);
    await this._dependencies.record(execution.id, 'execution.failed', failed.error ?? error);
  }

  /** Registers one live task and schedules admission when it settles. @public */
  public launchExecution(executionId: string, run: (signal: AbortSignal) => Promise<void>): void {
    const controller = new AbortController();
    const completion = Promise.resolve()
      .then(() => run(controller.signal))
      .catch(async (cause: unknown) => {
        const execution = this.latestExecution(executionId);
        if (this.isActive(execution.state)) {
          await this.finishFailedExecution(execution, cause, 'The execution stopped unexpectedly.');
        }
      });
    this._activeExecutions.set(executionId, { controller, completion });
    void completion.finally(() => {
      const active = this._activeExecutions.get(executionId);
      if (active?.completion === completion) this._activeExecutions.delete(executionId);
      this._pausingExecutions.delete(executionId);
      // A released slot belongs to work that already started before it belongs to the queue,
      // and to the queue before it belongs to whatever autonomy would pick next.
      void this._dependencies
        .resumeRequestedOperatorExecutions()
        .then(() => this._dependencies.drainExecutionQueue());
    });
  }

  /**
   * Puts a paused execution back into flight: one durable record change, one status event, one
   * launch. Every reactivation - operator, lifecycle, or start-up recovery - goes through here,
   * so a resumed execution never keeps the pause marker that parked it.
   */
  private async reactivatePausedExecution(
    execution: IExecutionRecord,
    message: string,
  ): Promise<IExecutionRecord> {
    const waiting: IExecutionRecord = {
      ...execution,
      state: 'waiting',
      pause: undefined,
      error: undefined,
      finishedAt: undefined,
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(waiting);
    await this._dependencies.record(execution.id, 'agent.progress', message, {
      origin: 'orchestrator',
      category: 'status',
    });
    this.launchExecution(execution.id, (signal) =>
      this.resumeInterruptedExecution(waiting, signal),
    );
    return waiting;
  }

  /** Records the requested pause or completes cancellation. @public */
  public async finishAbortedExecution(execution: IExecutionRecord): Promise<void> {
    const pauseReason = this._pausingExecutions.get(execution.id);
    if (!pauseReason) {
      await this.finishCancelledExecution(execution);
      return;
    }
    const waiting: IExecutionRecord = {
      ...this.latestExecution(execution.id),
      state: 'waiting',
      pause: { reason: pauseReason, pausedAt: this._dependencies.clock.now() },
      error: undefined,
      finishedAt: undefined,
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(waiting);
    await this._dependencies.record(
      execution.id,
      'agent.progress',
      pauseReason === 'operator'
        ? 'Execution paused by the operator and remains available to resume.'
        : 'Execution paused safely and remains available for reactivation.',
      { origin: 'orchestrator', category: 'status' },
    );
  }

  private async finishCancelledExecution(execution: IExecutionRecord): Promise<void> {
    const cancelled: IExecutionRecord = {
      ...this.latestExecution(execution.id),
      state: 'cancelled',
      pause: undefined,
      finishedAt: this._dependencies.clock.now(),
      lastHeartbeatAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecution(cancelled);
    let claimReleaseFailed = false;
    const cancellationClaims =
      cancelled.workItemClaims ?? (cancelled.workItemClaim ? [cancelled.workItemClaim] : []);
    if (cancellationClaims.length) {
      try {
        const releasedClaims: IWorkItemClaim[] = [];
        for (const claim of cancellationClaims) {
          await this._dependencies.releaseWorkItemClaim(claim);
          releasedClaims.push({ ...claim, releasedAt: this._dependencies.clock.now() });
        }
        const releasedRootClaim = releasedClaims.find(
          (claim) => claim.workItemId === cancelled.workItemId,
        );
        this._dependencies.repository.saveExecution({
          ...cancelled,
          workItemClaims: releasedClaims,
          ...(releasedRootClaim ? { workItemClaim: releasedRootClaim } : {}),
        });
      } catch {
        claimReleaseFailed = true;
      }
    }
    const workspaceOutcome = await this._dependencies.finalizeWorkspace(cancelled);
    const workspaceMessage =
      workspaceOutcome === 'preserved'
        ? 'Execution cancelled by the user. Workspace changes were preserved.'
        : workspaceOutcome === 'released'
          ? 'Execution cancelled by the user. The workspace was released.'
          : workspaceOutcome === 'unconfirmed'
            ? 'Execution cancelled by the user. Workspace cleanup could not be confirmed.'
            : 'Execution cancelled by the user.';
    const message = claimReleaseFailed
      ? `${workspaceMessage} The distributed work-item claim could not be released and requires operator recovery.`
      : workspaceMessage;
    await this._dependencies.record(execution.id, 'execution.cancelled', message);
  }

  /** Identifies execution states that have not reached a terminal outcome. @public */
  public isActive(state: ExecutionState): boolean {
    return state === 'queued' || state === 'running' || state === 'waiting';
  }

  // #endregion
}
