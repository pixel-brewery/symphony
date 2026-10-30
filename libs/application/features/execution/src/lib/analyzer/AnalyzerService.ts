// #region Imports

import type { IRemoteProjectionQueries } from './IRemoteProjectionQueries';
import type {
  IExecutionQueueEntry,
  IExecutionRecord,
  IDeliveryGroup,
  IDeliveryGroupProposal,
  IGoalRecord,
  IGoalReviewDecision,
} from '@symphony/domain-execution';
import type { IAgenticDeliveryPolicy, IAgenticDeliveryRecord } from '@symphony/domain-automation';
import type { ICiRunDetails } from '@symphony/domain-ci';
import type { IWorkItem } from '@symphony/domain-work';
import type { IWorkspaceCleanupResult } from '@symphony/domain-workspace';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';
import type { ExecutionAdmission } from './ExecutionAdmission';
import type { IAnalyzerDependencies } from './IAnalyzerDependencies';
import type { IExecutionServices } from '../composition/IExecutionServices';
import { createExecutionServices } from '../composition/createExecutionServices';
import type { IExecutionStateProjection } from '@symphony/domain-execution';
import type { IExecutionProjectionPort } from '../ports/IExecutionProjectionPort';

// #endregion

/** Composes execution owners behind the existing application API. @public */
export class AnalyzerService implements IExecutionProjectionPort {
  // #region Fields

  private readonly _remoteProjectionService: IRemoteProjectionQueries;
  private readonly _services: IExecutionServices;

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IAnalyzerDependencies) {
    this._remoteProjectionService = _dependencies.remoteProjectionQueries;
    this._services = createExecutionServices(_dependencies);
  }

  // #endregion

  // #region Methods

  /**
   * Returns the execution state.
   *
   * @public
   */
  public executionState(): IExecutionStateProjection {
    return {
      executions: this._dependencies.repository.listExecutions(),
      executionQueue: this._services.admission.listExecutionQueue(),
      events: this._dependencies.repository.listEvents(),
      goals: this._dependencies.repository.listGoals(),
      deliveryGroups: this._dependencies.repository.listDeliveryGroups(),
      deliveryGroupProposals: this._dependencies.repository.listDeliveryGroupProposals(),
    };
  }

  /**
   * Lists the goals.
   *
   * @public
   */
  public listGoals(): readonly IGoalRecord[] {
    return this._services.goals.listGoals();
  }

  /**
   * Creates a relationship proposal. The target is always retained as root. A direct manual
   * proposal deliberately skips Analyzer evidence and requires an operator attestation.
   *
   * @public
   */
  public async assessDeliveryGroup(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: IDeliveryGroup['activationSource'],
    assessmentMode: 'analyzer' | 'direct' = 'analyzer',
  ): Promise<IDeliveryGroupProposal> {
    return this._services.groups.assessDeliveryGroup(
      workItemIds,
      rootWorkItemId,
      activationSource,
      assessmentMode,
    );
  }

  /**
   * Persists an explicitly attested visual group without Analyzer or tracker-side relation
   * synchronization. The already loaded work items are reused for activation.
   *
   * @public
   */
  public async groupDeliveryDirectly(
    workItemIds: readonly string[],
    rootWorkItemId: string,
    activationSource: Extract<IDeliveryGroup['activationSource'], 'manual-drag' | 'manual-select'>,
  ): Promise<IDeliveryGroup> {
    return this._services.groups.groupDeliveryDirectly(
      workItemIds,
      rootWorkItemId,
      activationSource,
    );
  }

  /**
   * Confirms a current proposal and persists its target-rooted group.
   *
   * @param proposalId - Proposal identifier.
   * @param attestation - Optional operator attestation that bypasses the evidence gates of a
   * manually assembled proposal; the safety gates always stay enforced.
   * @returns The activated delivery group.
   * @public
   */
  public async confirmDeliveryGroup(
    proposalId: string,
    attestation?: { reason?: string },
  ): Promise<IDeliveryGroup> {
    return this._services.groups.confirmDeliveryGroup(proposalId, attestation);
  }

  /**
   * Records a human rejection without deleting the Analyzer evidence.
   *
   * @param proposalId - Proposal identifier.
   * @param reason - Optional operator reason.
   * @returns The rejected proposal.
   * @public
   */
  public async rejectDeliveryGroup(
    proposalId: string,
    reason?: string,
  ): Promise<IDeliveryGroupProposal> {
    return this._services.groups.rejectDeliveryGroup(proposalId, reason);
  }

  /**
   * Dissolves an unmerged group while preserving its historical record.
   *
   * @param groupId - Delivery-group identifier.
   * @returns The dissolved group.
   * @public
   */
  public async dissolveDeliveryGroup(groupId: string): Promise<IDeliveryGroup> {
    return this._services.groups.dissolveDeliveryGroup(groupId);
  }

  /**
   * Aligns every member to the provider column currently occupied by the root.
   *
   * @param groupId - Delivery-group identifier.
   * @returns The aligned group.
   * @public
   */
  public async alignDeliveryGroup(groupId: string): Promise<IDeliveryGroup> {
    return this._services.groups.alignDeliveryGroup(groupId);
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
    agentTeamId: string | undefined,
    responsibleAgentId: string | undefined,
    objective: string | undefined,
  ): Promise<IGoalRecord> {
    return this._services.goals.delegateWorkItem(
      workItemId,
      agentTeamId,
      responsibleAgentId,
      objective,
    );
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
    decision: IGoalReviewDecision['decision'],
    message: string,
  ): Promise<IGoalRecord> {
    return this._services.goals.reviewGoal(workItemId, decision, message);
  }

  /**
   * Returns the active execution records.
   *
   * @public
   */
  public activeExecutionRecords(): readonly IExecutionRecord[] {
    return this._services.lifecycle.activeExecutionRecords();
  }

  /**
   * Cancels the active executions.
   *
   * @public
   */
  public cancelActiveExecutions(): Promise<readonly IExecutionRecord[]> {
    return this._services.lifecycle.cancelActiveExecutions();
  }

  /**
   * Pauses the active executions.
   *
   * @public
   */
  public pauseActiveExecutions(): Promise<readonly IExecutionRecord[]> {
    return this._services.lifecycle.pauseActiveExecutions();
  }

  /**
   * Pauses the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async pauseExecution(executionId: string): Promise<IExecutionRecord> {
    return this._services.lifecycle.pauseExecution(executionId);
  }

  /**
   * Resumes the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async resumeExecution(executionId: string): Promise<IExecutionRecord> {
    return this._services.lifecycle.resumeExecution(executionId);
  }

  /**
   * Returns the execution capacity.
   *
   * @public
   */
  public executionCapacity(): { maximum: number; active: number; available: number } {
    return this._services.admission.executionCapacity();
  }

  /**
   * Lists the execution queue.
   *
   * @public
   */
  public listExecutionQueue(): readonly IExecutionQueueEntry[] {
    return this._services.admission.listExecutionQueue();
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
    return this._services.admission.requestAnalysis(
      simulateFailure,
      workItemId,
      request,
      executionApproval,
    );
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
    return this._services.admission.requestSolution(
      simulateFailure,
      workItemId,
      feedback,
      executionApproval,
    );
  }

  /**
   * Withdraws a waiting step. Nothing was reserved for it, so removal has no other effect.
   *
   * @param entryId - Entry id.
   * @public
   */
  public removeExecutionQueueEntry(entryId: string): IExecutionQueueEntry {
    return this._services.admission.removeExecutionQueueEntry(entryId);
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
    return this._services.admission.drainExecutionQueue();
  }

  /**
   * Returns the reconcile active executions.
   *
   * @public
   */
  public reconcileActiveExecutions(): Promise<number> {
    return this._services.lifecycle.reconcileActiveExecutions();
  }

  /**
   * Loads the work item details.
   *
   * @param workItemId - Work item id.
   * @public
   */
  public loadWorkItemDetails(workItemId: string): Promise<IWorkItem> {
    return this._remoteProjectionService.loadWorkItemDetails(workItemId);
  }

  /**
   * Lists the operational work items.
   *
   * @public
   */
  public listOperationalWorkItems(): Promise<readonly IWorkItem[]> {
    return this._remoteProjectionService.loadOperationalWorkItems();
  }

  /**
   * Returns the recover interrupted executions.
   *
   * @public
   */
  public async recoverInterruptedExecutions(): Promise<void> {
    return this._services.lifecycle.recoverInterruptedExecutions();
  }

  /**
   * Returns the reactivate interrupted executions.
   *
   * @public
   */
  public async reactivateInterruptedExecutions(): Promise<number> {
    return this._services.lifecycle.reactivateInterruptedExecutions();
  }

  /**
   * Clears the workspaces.
   *
   * @public
   */
  public async clearWorkspaces(): Promise<IWorkspaceCleanupResult> {
    return this._services.workspace.clearWorkspaces();
  }

  /**
   * Clears the workspace.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async clearWorkspace(workspaceId: string): Promise<IWorkspaceCleanupResult> {
    return this._services.workspace.clearWorkspace(workspaceId);
  }

  /**
   * Publishes the pull request.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async publishPullRequest(executionId: string): Promise<IExecutionRecord> {
    return this._services.publication.publishPullRequest(executionId);
  }

  /**
   * Returns the cleanup eligible workspaces.
   *
   * @public
   */
  public async cleanupEligibleWorkspaces(): Promise<void> {
    return this._services.workspace.cleanupEligibleWorkspaces();
  }

  /**
   * Releases inactive analysis workspaces when delivery capacity needs to be reclaimed.
   *
   * Failed implementation and revision workspaces may contain the only recoverable source
   * changes and are never selected here. Analysis is read-only with respect to target source,
   * while its durable summary and diagnostics remain in persistence after the worktree is gone.
   *
   * @public
   */
  public async cleanupReclaimableAnalysisWorkspaces(): Promise<number> {
    return this._services.workspace.cleanupReclaimableAnalysisWorkspaces();
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
    return this._services.admission.start(
      simulateFailure,
      workItemId,
      request,
      automationTrigger,
      executionApproval,
    );
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
    return this._services.admission.startForWorkItem(workItem, request, automationTrigger);
  }

  /**
   * Cancels the execution.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async cancelExecution(executionId: string): Promise<IExecutionRecord> {
    return this._services.lifecycle.cancelExecution(executionId);
  }

  /**
   * Completes the manual analysis.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualAnalysis(
    workItemId: string,
    summary: string,
  ): Promise<IExecutionRecord> {
    return this._services.manual.completeManualAnalysis(workItemId, summary);
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
    return this._services.admission.startSolution(
      simulateFailure,
      workItemId,
      feedback,
      automationTrigger,
      executionApproval,
    );
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
    return this._services.admission.startSolutionForWorkItem(workItem, feedback, automationTrigger);
  }

  /**
   * Starts the agentic delivery diagnosis.
   *
   * @param workItem - Work item.
   * @param sourceExecution - Source execution.
   * @param delivery - Delivery.
   * @param evidence - Evidence.
   * @param policy - Policy.
   * @public
   */
  public async startAgenticDeliveryDiagnosis(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord> {
    return this._services.starting.startAgenticDeliveryDiagnosis(
      workItem,
      sourceExecution,
      delivery,
      evidence,
      policy,
    );
  }

  /**
   * Starts the agentic delivery repair.
   *
   * @param workItem - Work item.
   * @param sourceExecution - Source execution.
   * @param diagnosis - Diagnosis.
   * @param delivery - Delivery.
   * @param evidence - Evidence.
   * @param policy - Policy.
   * @public
   */
  public async startAgenticDeliveryRepair(
    workItem: IWorkItem,
    sourceExecution: IExecutionRecord,
    diagnosis: IExecutionRecord,
    delivery: IAgenticDeliveryRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
  ): Promise<IExecutionRecord> {
    return this._services.starting.startAgenticDeliveryRepair(
      workItem,
      sourceExecution,
      diagnosis,
      delivery,
      evidence,
      policy,
    );
  }

  /**
   * Completes the manual solution.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualSolution(
    workItemId: string,
    summary: string,
  ): Promise<IExecutionRecord> {
    return this._services.manual.completeManualSolution(workItemId, summary);
  }

  /**
   * Extends the shared lease of every running execution.
   *
   * The lease lives in the provider claim, so a second orchestrator reads it to tell a live
   * run from a crashed one. Renewing on a timer - not only on agent progress - keeps a long
   * quiet step from looking abandoned.
   *
   * @public
   */
  public async renewActiveClaims(): Promise<number> {
    return this._services.claims.renewActiveClaims();
  }

  /**
   * Frees claim references that outlived the runs that wrote them.
   *
   * Claims are released on the paths that end a run, but a crash, a lost machine, or a failed
   * release leaves the reference behind for good. A slow sweep keeps the shared repository from
   * collecting one dead claim per lost run; live claims are named as retained and never touched.
   *
   * @param limit - Limit.
   * @public
   */
  public async releaseAbandonedClaims(limit?: number): Promise<number> {
    return this._services.claims.releaseAbandonedClaims(limit);
  }

  /**
   * Records the work item.
   *
   * @param workItem - Work item.
   * @public
   */
  public recordWorkItem(workItem: IWorkItem): void {
    this._remoteProjectionService.recordWorkItem(workItem);
  }

  /** Reconciles group drift against the current Work Item reading. @public */
  public reconcileDeliveryGroupProjection(workItems: readonly IWorkItem[]): void;

  /** Reconciles drift before refreshing relationship proposals. @public */
  public reconcileDeliveryGroupProjection(
    workItems: readonly IWorkItem[],
    refreshProposals: true,
  ): Promise<void>;

  /** Applies the requested projection reconciliation in the existing order. @public */
  public reconcileDeliveryGroupProjection(
    workItems: readonly IWorkItem[],
    refreshProposals = false,
  ): void | Promise<void> {
    this._services.groups.reconcileDeliveryGroupDrift(workItems);
    if (refreshProposals) return this._services.groups.refreshRelationshipProposals(workItems);
  }

  // #endregion
}
