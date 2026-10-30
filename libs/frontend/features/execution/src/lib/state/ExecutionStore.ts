// #region Imports

import { computed, Inject, inject, Injectable, Optional, type Signal } from '@angular/core';
import type {
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IExecutionQueueEntry,
} from '@symphony/domain-execution';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type {
  IExecutionOperations,
  IExecutionProjectionValue,
} from '@symphony/frontend-core/execution';
import type { IExecutionContext } from '../ports/IExecutionContext';
import { EXECUTION_CONTEXT } from '../ports/ExecutionContextToken';
import type { IExecutionProjection } from '../ports/IExecutionProjection';
import { EXECUTION_PROJECTION } from '../ports/ExecutionProjectionToken';
import type { IExecutionRefresh } from '../ports/IExecutionRefresh';
import { EXECUTION_REFRESH } from '../ports/ExecutionRefreshToken';
import type { IExecutionRuntime } from '../ports/IExecutionRuntime';
import { EXECUTION_RUNTIME } from '../ports/ExecutionRuntimeToken';
import type { IExecutionPublication } from '../ports/IExecutionPublication';
import { EXECUTION_PUBLICATION } from '../ports/ExecutionPublicationToken';
import type { IExecutionSynchronization } from '../ports/IExecutionSynchronization';
import { EXECUTION_SYNCHRONIZATION } from '../ports/ExecutionSynchronizationToken';
import type { IExecutionClient } from '../ports/IExecutionClient';
import { EXECUTION_CLIENT } from '../ports/ExecutionClientToken';

// #endregion

/** Owns Execution commands and projections over the single transport value. @public */
@Injectable()
export class ExecutionStore implements IExecutionOperations {
  // #region Fields

  /** Current bounded transport projection. @public @readonly */
  public readonly snapshot: Signal<IExecutionProjectionValue | undefined>;
  /** Employee identities consumed by execution details. @public @readonly */
  public readonly agentProfiles: IExecutionContext['agentProfiles'];
  /** Freshness owned by the execution synchronization lifecycle. @public @readonly */
  public readonly activityFresh: Signal<boolean>;
  /** Accepted steps in their existing queue order. @public @readonly */
  public readonly executionQueue: Signal<readonly IExecutionQueueEntry[]>;

  // #endregion

  // #region Ctor

  /** Connects typed Execution dependencies without starting subscriptions. @public */
  public constructor(
    @Inject(EXECUTION_CONTEXT)
    private readonly _context: IExecutionContext = inject(EXECUTION_CONTEXT),
    @Inject(EXECUTION_PROJECTION)
    private readonly _projection: IExecutionProjection = inject(EXECUTION_PROJECTION),
    @Inject(EXECUTION_REFRESH)
    private readonly _refresh: IExecutionRefresh = inject(EXECUTION_REFRESH),
    @Inject(EXECUTION_RUNTIME)
    private readonly _runtime: IExecutionRuntime = inject(EXECUTION_RUNTIME),
    @Optional()
    @Inject(EXECUTION_PUBLICATION)
    private readonly _publication: IExecutionPublication | null = inject(EXECUTION_PUBLICATION, {
      optional: true,
    }),
    @Inject(EXECUTION_SYNCHRONIZATION)
    private readonly _synchronizer: IExecutionSynchronization = inject(EXECUTION_SYNCHRONIZATION),
    @Inject(EXECUTION_CLIENT) private readonly _client: IExecutionClient = inject(EXECUTION_CLIENT),
    @Inject(NotificationService)
    private readonly _notifications: Pick<
      NotificationService,
      'showError' | 'showInfo' | 'showSuccess'
    > = inject(NotificationService),
  ) {
    this.snapshot = _context.projection;
    this.agentProfiles = _context.agentProfiles;
    this.activityFresh = _synchronizer.activityFresh;
    this.executionQueue = computed(() => _context.projection()?.executionQueue ?? []);
  }

  // #endregion

  // #region Methods

  /** Starts the existing event and reconciliation lifecycle once. @public */
  public initialize(): void {
    this._synchronizer.initialize();
  }
  /** Reconciles a detail surface through the shared snapshot owner. @public */
  public refresh(): Promise<void> {
    return this._refresh.refresh();
  }

  /**
   * Starts the analyzer.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param prompt - Prompt.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async startAnalyzer(
    simulateFailure: boolean,
    workItemId?: string,
    prompt?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean> {
    try {
      const admission = await this._client.request('analyzer.start', {
        simulateFailure,
        workItemId,
        ...(prompt ? { prompt } : {}),
        ...(executionApproval ? { executionApproval } : {}),
      });
      if (admission.outcome === 'queued') {
        this.applyQueuedAdmission(admission.entry);
        if (executionApproval === 'repository') await this._runtime.refreshRepositoryRuntime();
        return true;
      }
      const execution = admission.execution;
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: [
                ...snapshot.executions.filter((candidate) => candidate.id !== execution.id),
                execution,
              ],
              workItems: snapshot.workItems.map((item) =>
                item.id === execution.workItemId
                  ? {
                      ...item,
                      updatedAt: execution.startedAt,
                    }
                  : item,
              ),
            }
          : snapshot,
      );
      this._synchronizer.scheduleExecutionStateRefresh(0);
      if (executionApproval === 'repository') await this._runtime.refreshRepositoryRuntime();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to start Analyzer.');
      return false;
    }
  }

  /**
   * Returns the delegate work item.
   *
   * @param workItemId - Work item id.
   * @param agentTeamId - Agent team id.
   * @param responsibleAgentId - Responsible agent id.
   * @param objective - Objective.
   * @public
   */
  public async delegateWorkItem(
    workItemId: string,
    agentTeamId?: string,
    responsibleAgentId?: string,
    objective?: string,
  ): Promise<boolean> {
    try {
      const goal = await this._client.request('work-items.delegate', {
        workItemId,
        ...(agentTeamId ? { agentTeamId } : {}),
        ...(responsibleAgentId ? { responsibleAgentId } : {}),
        ...(objective?.trim() ? { objective: objective.trim() } : {}),
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              goals: [...(snapshot.goals ?? []).filter((item) => item.id !== goal.id), goal],
            }
          : snapshot,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to delegate this task.');
      return false;
    }
  }

  /**
   * Returns the review goal.
   *
   * @param workItemId - Work item id.
   * @param decision - Decision.
   * @param message - Message.
   * @public
   */
  public async reviewGoal(
    workItemId: string,
    decision: 'approved' | 'revision-required' | 'blocked',
    message: string,
  ): Promise<boolean> {
    try {
      const goal = await this._client.request('goals.review', { workItemId, decision, message });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              goals: [...(snapshot.goals ?? []).filter((item) => item.id !== goal.id), goal],
            }
          : snapshot,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to review this goal.');
      return false;
    }
  }

  /**
   * Requests read-only Analyzer evidence for a target-rooted group.
   *
   * @public
   */
  public async assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode: 'analyzer' | 'direct' = 'analyzer',
  ): Promise<IDeliveryGroupProposal | undefined> {
    try {
      const proposal = await this._client.request('delivery-groups.assess', {
        workItemIds,
        rootWorkItemId,
        activationSource,
        assessmentMode,
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              deliveryGroupProposals: [
                ...(snapshot.deliveryGroupProposals ?? []).filter(
                  (candidate) => candidate.id !== proposal.id,
                ),
                proposal,
              ],
            }
          : snapshot,
      );
      return proposal;
    } catch (cause) {
      this.showError(cause, 'Unable to assess these work items.');
      return undefined;
    }
  }

  /**
   * Creates an explicitly attested delivery group without starting the Analyzer.
   * Core boundary, revision, claim and overlap checks remain authoritative.
   *
   * @public
   */
  public async groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup | undefined> {
    try {
      const group = await this._client.request('delivery-groups.create-direct', {
        workItemIds,
        rootWorkItemId,
        activationSource,
      });
      this.replaceDeliveryGroup(group);
      return group;
    } catch (cause) {
      this.showError(cause, 'Unable to group these work items directly.');
      return undefined;
    }
  }

  /**
   * Confirms an evidence-backed delivery group.
   *
   * @param proposalId - Proposal identifier.
   * @param attestation - Operator attestation that bypasses the evidence gates of a manually
   * assembled proposal; the safety gates always stay enforced.
   * @public
   */
  public async confirmDeliveryGroup(
    proposalId: string,
    attestation?: { reason?: string },
  ): Promise<IDeliveryGroup | undefined> {
    try {
      const group = await this._client.request('delivery-groups.confirm', {
        proposalId,
        ...(attestation ? { attestation } : {}),
      });
      this.replaceDeliveryGroup(group);
      return group;
    } catch (cause) {
      this.showError(cause, 'Unable to group these work items.');
      return undefined;
    }
  }

  /**
   * Rejects a delivery-group proposal while retaining its evidence.
   *
   * @public
   */
  public async rejectDeliveryGroup(proposalId: string, reason?: string): Promise<boolean> {
    try {
      const proposal = await this._client.request('delivery-groups.reject', {
        proposalId,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              deliveryGroupProposals: [
                ...(snapshot.deliveryGroupProposals ?? []).filter(
                  (candidate) => candidate.id !== proposal.id,
                ),
                proposal,
              ],
            }
          : snapshot,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to reject the grouping proposal.');
      return false;
    }
  }

  /**
   * Dissolves an active delivery group.
   *
   * @public
   */
  public async dissolveDeliveryGroup(deliveryGroupId: string): Promise<boolean> {
    try {
      this.replaceDeliveryGroup(
        await this._client.request('delivery-groups.dissolve', { deliveryGroupId }),
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to dissolve the delivery group.');
      return false;
    }
  }

  /**
   * Aligns every member to the root provider column.
   *
   * @public
   */
  public async alignDeliveryGroup(deliveryGroupId: string): Promise<boolean> {
    try {
      this.replaceDeliveryGroup(
        await this._client.request('delivery-groups.align', { deliveryGroupId }),
      );
      await this._refresh.refresh();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to align the delivery group.');
      return false;
    }
  }

  /**
   * Completes the manual analysis.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualAnalysis(workItemId: string, summary: string): Promise<boolean> {
    try {
      const execution = await this._client.request('analysis.complete-manually', {
        workItemId,
        summary,
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: [
                ...snapshot.executions.filter((candidate) => candidate.id !== execution.id),
                execution,
              ],
              workItems: snapshot.workItems.map((item) =>
                item.id === execution.workItemId
                  ? {
                      ...item,
                      updatedAt: execution.finishedAt ?? execution.startedAt,
                    }
                  : item,
              ),
            }
          : snapshot,
      );
      // Completing an analysis can route the item into the implementation stage and update its
      // goal. Execution events may arrive before the request returns, when the local snapshot
      // does not know the execution ID yet, so their focused item refresh cannot close this gap.
      await this._refresh.refresh();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to record manual analysis.');
      return false;
    }
  }

  /**
   * Starts the solver.
   *
   * @param simulateFailure - Simulate failure.
   * @param workItemId - Work item id.
   * @param feedback - Feedback.
   * @param executionApproval - Execution approval.
   * @public
   */
  public async startSolver(
    simulateFailure: boolean,
    workItemId: string,
    feedback?: string,
    executionApproval?: 'once' | 'repository',
  ): Promise<boolean> {
    try {
      const admission = await this._client.request('solver.start', {
        simulateFailure,
        workItemId,
        feedback,
        ...(executionApproval ? { executionApproval } : {}),
      });
      if (admission.outcome === 'queued') {
        this.applyQueuedAdmission(admission.entry);
        if (executionApproval === 'repository') await this._runtime.refreshRepositoryRuntime();
        return true;
      }
      const execution = admission.execution;
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: [
                ...snapshot.executions.filter((candidate) => candidate.id !== execution.id),
                execution,
              ],
              workItems: snapshot.workItems.map((item) =>
                item.id === execution.workItemId
                  ? { ...item, state: 'executing', updatedAt: execution.startedAt }
                  : item,
              ),
            }
          : snapshot,
      );
      this._synchronizer.scheduleExecutionStateRefresh(0);
      if (executionApproval === 'repository') await this._runtime.refreshRepositoryRuntime();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to start Solver.');
      return false;
    }
  }

  /**
   * Completes the manual solution.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualSolution(workItemId: string, summary: string): Promise<boolean> {
    try {
      const execution = await this._client.request('solution.complete-manually', {
        workItemId,
        summary,
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: [
                ...snapshot.executions.filter((candidate) => candidate.id !== execution.id),
                execution,
              ],
              workItems: snapshot.workItems.map((item) =>
                item.id === execution.workItemId
                  ? {
                      ...item,
                      state: 'executing',
                      updatedAt: execution.finishedAt ?? execution.startedAt,
                    }
                  : item,
              ),
            }
          : snapshot,
      );
      // Manual completion updates goal and verification evidence outside the execution record.
      // Reconcile the shared snapshot before the drawer offers its next workflow action.
      await this._refresh.refresh();
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to record manual implementation.');
      return false;
    }
  }

  /**
   * Withdraws a waiting step. Nothing was reserved for it, so removal is immediate.
   *
   * @param entryId - Entry id.
   * @public
   */
  public async removeQueueEntry(entryId: string): Promise<boolean> {
    try {
      const entry = await this._client.request('execution-queue.remove', { entryId });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executionQueue: (snapshot.executionQueue ?? []).filter(
                (candidate) => candidate.id !== entry.id,
              ),
            }
          : snapshot,
      );
      this._notifications.showInfo(
        'Removed from the queue.',
        `${entry.workItemExternalId} no longer waits for an execution slot.`,
      );
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to remove the queued step.');
      return false;
    }
  }

  /**
   * Cancels the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const execution = await this._client.request('execution.cancel', { executionId });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: snapshot.executions.map((candidate) =>
                candidate.id === execution.id ? execution : candidate,
              ),
            }
          : snapshot,
      );
      this._notifications.showInfo('Execution cancelled.', 'The active agent was stopped.');
      return true;
    } catch (cause) {
      this.showError(cause, 'Unable to cancel the execution.');
      return false;
    }
  }

  /** Whether the actual Delivery publication participant is included. @public @readonly */
  public get publicationAvailable(): boolean {
    return this._publication !== null;
  }

  /** Delegates publication without creating another busy owner. @public */
  public publishPullRequest(executionId: string): Promise<boolean> {
    return this._publication?.publishPullRequest(executionId) ?? Promise.resolve(false);
  }

  /**
   * Records a step that was accepted but has to wait for a free execution slot.
   *
   * Reaching the parallel-execution limit used to end the interaction with an error, which
   * lost the operator's decision. The entry is added locally so the rail shows the waiting
   * step immediately, without waiting for the next state poll.
   */
  private applyQueuedAdmission(entry: IExecutionQueueEntry): void {
    this._projection.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            executionQueue: [
              ...(snapshot.executionQueue ?? []).filter((candidate) => candidate.id !== entry.id),
              entry,
            ].sort((left, right) => left.queuedAt.localeCompare(right.queuedAt)),
          }
        : snapshot,
    );
    this._notifications.showInfo(
      'Queued for the next execution slot.',
      `${entry.workItemExternalId} starts as soon as a run finishes.`,
    );
  }

  private replaceDeliveryGroup(group: IDeliveryGroup): void {
    this._projection.update((snapshot) =>
      snapshot
        ? {
            ...snapshot,
            deliveryGroups: [
              ...(snapshot.deliveryGroups ?? []).filter((candidate) => candidate.id !== group.id),
              group,
            ],
          }
        : snapshot,
    );
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
