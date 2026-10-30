// #region Imports

import type {
  ExecutionQueueKind,
  IExecutionQueueEntry,
  IExecutionRecord,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { stageExecutesRole } from '@symphony/domain-workflow';
import {
  isCompletedAnalysis,
  queueEntryForWorkItem,
  sortExecutionQueue,
} from '@symphony/domain-execution';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';
import type { ExecutionAdmission } from '../analyzer/ExecutionAdmission';
import { ExecutionCapacityError } from '../analyzer/ExecutionCapacityError';
import type { IExecutionAdmission } from './IExecutionAdmission';
import type { IExecutionAdmissionDependencies } from './IExecutionAdmissionDependencies';

// #endregion

/** Owns execution reservations, admission and queue draining. @public */
export class ExecutionAdmissionService implements IExecutionAdmission {
  // #region Fields

  private _resumingRequestedExecutions = false;

  private _executionQueueDrain?: Promise<number>;

  private _executionQueueDrainRequested = false;

  private _queueDrainSuspensions = 0;

  private _startingExecutions = 0;

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionAdmissionDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the execution capacity.
   *
   * @public
   */
  public executionCapacity(): { maximum: number; active: number; available: number } {
    const maximum = Math.max(1, Math.floor(this._dependencies.maxParallelExecutions()));
    const active = this._dependencies.repository
      .listExecutions()
      .filter((execution) => this.usesExecutionCapacity(execution)).length;
    return { maximum, active, available: Math.max(0, maximum - active) };
  }

  /**
   * Lists the execution queue.
   *
   * @public
   */
  public listExecutionQueue(): readonly IExecutionQueueEntry[] {
    return sortExecutionQueue(this._dependencies.repository.listExecutionQueue());
  }

  /**
   * Admits an analysis: it starts now, or it waits in the queue for the next free slot.
   *
   * Reaching the parallel-execution limit is a scheduling fact, not a rejection of the
   * operator's decision, so the request is kept instead of refused. Capacity is not probed
   * before starting - the start itself reserves the slot, and only a refusal for lack of
   * capacity falls through to the queue, so two operators clicking at once cannot both pass a
   * check and then exceed the limit.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param request - Request.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async requestAnalysis(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<ExecutionAdmission> {
    try {
      return {
        outcome: 'started',
        execution: await this.start(
          simulateFailure,
          workItemId,
          request,
          undefined,
          executionApproval,
        ),
      };
    } catch (cause) {
      if (!(cause instanceof ExecutionCapacityError)) throw cause;
      return {
        outcome: 'queued',
        entry: await this.enqueueExecution('analysis', workItemId, request, executionApproval),
      };
    }
  }

  /**
   * Admits an implementation or revision; see {@link requestAnalysis}.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param feedback - Feedback.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async requestSolution(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<ExecutionAdmission> {
    try {
      return {
        outcome: 'started',
        execution: await this.startSolution(
          simulateFailure,
          workItemId,
          feedback,
          undefined,
          executionApproval,
        ),
      };
    } catch (cause) {
      if (!(cause instanceof ExecutionCapacityError)) throw cause;
      return {
        outcome: 'queued',
        entry: await this.enqueueExecution('solution', workItemId, feedback, executionApproval),
      };
    }
  }

  /**
   * Withdraws a waiting step. Nothing was reserved for it, so removal has no other effect.
   *
   * @param entryId - Entry id.
   * @public
   */
  public removeExecutionQueueEntry(entryId: string): IExecutionQueueEntry {
    const entry = this.listExecutionQueue().find((candidate) => candidate.id === entryId);
    if (!entry) throw new Error(`Unknown queue entry: ${entryId}`);
    this._dependencies.repository.removeExecutionQueueEntry(entryId);
    return entry;
  }

  /**
   * Starts as many waiting steps as there are free slots, oldest first.
   *
   * This is what makes the queue self-draining: it runs whenever a slot is released, at
   * startup, and before an autonomous cycle picks its own work, so a waiting step always moves
   * ahead of anything autonomy would start next. An entry that cannot start yet - because the
   * item moved, lost its analysis, or its repository is not prepared - keeps its place with the
   * reason recorded, and the drain continues with the next entry rather than stalling the whole
   * queue behind it.
   *
   * @public
   */
  public drainExecutionQueue(): Promise<number> {
    if (this._executionQueueDrain) {
      // A slot released while a drain is already running still has to be offered to the
      // queue, so the running drain repeats instead of the release being dropped.
      this._executionQueueDrainRequested = true;
      return this._executionQueueDrain;
    }
    const operation = this.drainExecutionQueueUntilSettled().finally(() => {
      if (this._executionQueueDrain === operation) this._executionQueueDrain = undefined;
    });
    this._executionQueueDrain = operation;
    return operation;
  }

  private async drainExecutionQueueUntilSettled(): Promise<number> {
    let started = 0;
    do {
      this._executionQueueDrainRequested = false;
      started += await this.drainExecutionQueueOnce();
    } while (this._executionQueueDrainRequested);
    return started;
  }

  private async drainExecutionQueueOnce(): Promise<number> {
    if (this._queueDrainSuspensions > 0) return 0;
    if (this._dependencies.queueDrainAllowed?.() === false) return 0;
    let started = 0;
    for (const entry of this.listExecutionQueue()) {
      const capacity = this.executionCapacity();
      if (capacity.active + this._startingExecutions >= capacity.maximum) break;
      if (this._dependencies.queueDrainAllowed?.() === false) break;
      try {
        if (entry.kind === 'analysis') {
          await this.start(
            false,
            entry.workItemId,
            entry.request,
            undefined,
            entry.executionApproval,
          );
        } else {
          await this.startSolution(
            false,
            entry.workItemId,
            entry.request,
            undefined,
            entry.executionApproval,
          );
        }
        this._dependencies.repository.removeExecutionQueueEntry(entry.id);
        started += 1;
      } catch (cause) {
        if (cause instanceof ExecutionCapacityError) break;
        this._dependencies.repository.saveExecutionQueueEntry({
          ...entry,
          lastError:
            cause instanceof Error ? cause.message : 'The queued step could not be started.',
          lastAttemptAt: this._dependencies.clock.now(),
        });
      }
    }
    return started;
  }

  /**
   * Records a step that only lacks a slot.
   *
   * Everything the run needs later is captured here, and everything that would reserve a
   * resource is not: no workspace, no claim, no agent session. The checks that must hold for
   * the operator to have meant this - the stage runs the role, nothing else runs on the item,
   * an implementation has an analysis to build on - are applied now so an impossible request is
   * refused while the operator is still present. Whether they still hold when the slot opens is
   * decided again by the start itself.
   */
  private async enqueueExecution(
    kind: ExecutionQueueKind,
    workItemId: string | undefined,
    request: string | undefined,
    executionApproval: 'once' | 'repository' | undefined,
  ): Promise<IExecutionQueueEntry> {
    const queue = this.listExecutionQueue();
    const item = await this.resolveQueueWorkItem(kind, workItemId, queue);
    this._dependencies.assertStageAllowsRole(item, kind === 'analysis' ? 'analyze' : 'solve');
    this.assertNoActiveExecution(item);
    const existing = queueEntryForWorkItem(queue, item.id);
    if (existing) {
      throw new Error(`A step for ${item.externalId} is already waiting for an execution slot.`);
    }
    const normalizedRequest = request?.trim() || undefined;
    if (kind === 'solution') this.assertSolutionQueueable(item, normalizedRequest);
    await this._dependencies.authorizeLocalExecution?.(item, executionApproval);

    const entry: IExecutionQueueEntry = {
      id: this._dependencies.ids.next('queue'),
      ...(item.workspaceId ? { workspaceId: item.workspaceId } : {}),
      workItemId: item.id,
      workItemExternalId: item.externalId,
      workItemTitle: item.title,
      kind,
      ...(normalizedRequest ? { request: normalizedRequest } : {}),
      ...(executionApproval ? { executionApproval } : {}),
      origin: 'operator',
      queuedAt: this._dependencies.clock.now(),
    };
    this._dependencies.repository.saveExecutionQueueEntry(entry);
    return entry;
  }

  private async resolveQueueWorkItem(
    kind: ExecutionQueueKind,
    workItemId: string | undefined,
    queue: readonly IExecutionQueueEntry[],
  ): Promise<IWorkItem> {
    const items = await this._dependencies.remoteProjectionQueries.loadOperationalWorkItems();
    if (workItemId) {
      const item = items.find((candidate) => candidate.id === workItemId);
      if (!item) throw new Error(`Unknown work item: ${workItemId}`);
      return item;
    }
    if (kind === 'solution') throw new Error('A work item is required to queue an implementation.');
    const executions = this._dependencies.repository.listExecutions();
    const item = items.find(
      (candidate) =>
        stageExecutesRole(this._dependencies.workflow().stages, candidate.stageId, 'analyze') &&
        !queueEntryForWorkItem(queue, candidate.id) &&
        !executions.some(
          (execution) =>
            execution.workItemId === candidate.id && this._dependencies.isActive(execution.state),
        ),
    );
    if (!item) throw new Error('No work item is ready for analysis.');
    return item;
  }

  private assertSolutionQueueable(item: IWorkItem, feedback: string | undefined): void {
    const executions = this._dependencies.repository
      .listExecutions()
      .filter((execution) => execution.workItemId === item.id);
    if (!executions.some(isCompletedAnalysis)) {
      throw new Error('Complete an analysis before starting the Solver.');
    }
    const hasSucceededSolution = executions.some(
      (execution) =>
        (execution.kind === 'solution' || execution.kind === 'revision') &&
        execution.state === 'succeeded',
    );
    if (hasSucceededSolution && !feedback) {
      throw new Error('Describe what the Solver should change before starting a revision.');
    }
  }

  /** Suppresses queue refill until a bulk lifecycle operation settles. @public */
  /**
   * Runs a bulk lifecycle operation without the queue refilling the slots it frees.
   *
   * Pausing or cancelling everything is how Symphony steps back - for a reconcile, a shutdown,
   * or a storage emergency - so a queue that immediately started the next step would defeat
   * exactly the operation that released the capacity.
   */
  public async withQueueDrainSuspended<T>(operation: () => Promise<T>): Promise<T> {
    this._queueDrainSuspensions += 1;
    try {
      return await operation();
    } finally {
      this._queueDrainSuspensions -= 1;
    }
  }

  /** Reserves capacity synchronously before asynchronous preparation starts. @public */
  public reserveExecutionCapacity(): void {
    const { maximum: limit, active } = this.executionCapacity();
    if (active + this._startingExecutions >= limit) throw new ExecutionCapacityError(active, limit);
    this._startingExecutions += 1;
  }

  private usesExecutionCapacity(execution: IExecutionRecord): boolean {
    return this._dependencies.isActive(execution.state) && execution.pause?.reason !== 'operator';
  }

  /** Reactivates waiting operator requests in their recorded order. @public */
  public async resumeRequestedOperatorExecutions(): Promise<void> {
    if (this._resumingRequestedExecutions) return;
    this._resumingRequestedExecutions = true;
    try {
      const requested = this._dependencies.repository
        .listExecutions()
        .filter(
          (execution) =>
            execution.state === 'waiting' &&
            execution.pause?.reason === 'operator' &&
            execution.pause.resumeRequestedAt !== undefined,
        )
        .sort((left, right) =>
          left.pause!.resumeRequestedAt!.localeCompare(right.pause!.resumeRequestedAt!),
        );
      for (const execution of requested) {
        const capacity = this.executionCapacity();
        if (capacity.active + this._startingExecutions >= capacity.maximum) return;
        await this._dependencies.resumeExecution(execution.id);
      }
    } finally {
      this._resumingRequestedExecutions = false;
    }
  }

  /** Counts reservations that have not yet produced a durable active run. @public */
  public pendingExecutionStarts(): number {
    return this._startingExecutions;
  }

  /** Releases the reservation when execution preparation settles. @public */
  public releaseExecutionCapacity(): void {
    this._startingExecutions -= 1;
  }

  /**
   * Starts.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param request - Request.
   * @param automationTrigger - Automation trigger.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async start(
    simulateFailure: boolean,
    workItemId?: string,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord> {
    this.reserveExecutionCapacity();
    try {
      return await this._dependencies.startAnalysis(
        simulateFailure,
        workItemId,
        request,
        automationTrigger,
        executionApproval,
      );
    } finally {
      this._startingExecutions -= 1;
    }
  }

  /**
   * Starts the solution.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param feedback - Feedback.
   * @param automationTrigger - Automation trigger.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async startSolution(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
    executionApproval?: 'once' | 'repository',
  ): Promise<IExecutionRecord> {
    this.reserveExecutionCapacity();
    try {
      return await this._dependencies.startSolver(
        simulateFailure,
        workItemId,
        feedback,
        automationTrigger,
        executionApproval,
      );
    } finally {
      this._startingExecutions -= 1;
    }
  }

  /**
   * Starts the for work item.
   *
   * @param workItem - Work item.
   * @param request - Request.
   * @param automationTrigger - Automation trigger.
   * @public
   */
  public startForWorkItem(
    workItem: IWorkItem,
    request?: string,
    automationTrigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord> {
    this._dependencies.remoteProjectionQueries.recordWorkItem(workItem);
    return this.start(false, workItem.id, request, automationTrigger);
  }

  /**
   * Starts the solution for work item.
   *
   * @param workItem - Work item.
   * @param feedback - Feedback.
   * @param automationTrigger - Automation trigger.
   * @public
   */
  public startSolutionForWorkItem(
    workItem: IWorkItem,
    feedback?: string,
    automationTrigger?: IAutomationExecutionTrigger,
  ): Promise<IExecutionRecord> {
    this._dependencies.remoteProjectionQueries.recordWorkItem(workItem);
    return this.startSolution(false, workItem.id, feedback, automationTrigger);
  }

  /** Coordinates assertNoActiveExecution through this owner. @public */
  public assertNoActiveExecution(item: IWorkItem): void {
    if (
      this._dependencies.repository
        .listExecutions()
        .some(
          (execution) =>
            execution.workItemId === item.id && this._dependencies.isActive(execution.state),
        )
    ) {
      throw new Error(`An execution is already running for ${item.externalId}.`);
    }
  }

  // #endregion
}
