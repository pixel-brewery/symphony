// #region Imports

import type {
  IExecutionBindingSnapshot,
  IExecutionRecord,
  IGoalRecord,
  IGoalReviewDecision,
  IImplementationContract,
  IGoalVerificationReport,
} from '@symphony/domain-execution';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem } from '@symphony/domain-work';
import { extractAcceptanceCriteria } from './extractAcceptanceCriteria';
import type { IExecutionGoals } from './IExecutionGoals';
import type { IExecutionGoalsDependencies } from './IExecutionGoalsDependencies';

// #endregion

/** Owns durable goal transitions and implementation contracts. @public */
export class ExecutionGoalService implements IExecutionGoals {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionGoalsDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Lists the goals.
   *
   * @public
   */
  public listGoals(): readonly IGoalRecord[] {
    return this._dependencies.repository.listGoals();
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
    const item = await this._dependencies.remoteProjectionQueries.loadWorkItemDetails(workItemId);
    const assignment = this._dependencies.goalAssignmentFor?.(
      item,
      agentTeamId,
      responsibleAgentId,
    );
    if (!assignment) throw new Error('No eligible AI team and responsible agent are available.');
    const now = this._dependencies.clock.now();
    const existing = this.goalForWorkItem(item.id);
    const goal: IGoalRecord = {
      ...existing,
      id: existing?.id ?? this._dependencies.ids.next('goal'),
      workspaceId: item.workspaceId ?? 'legacy',
      workItemId: item.id,
      assignment: {
        id: existing?.assignment.id ?? this._dependencies.ids.next('assignment'),
        workspaceId: item.workspaceId ?? 'legacy',
        workItemId: item.id,
        ...assignment,
        objective: objective?.trim() || item.title,
        assignedAt: existing?.assignment.assignedAt ?? now,
        updatedAt: now,
      },
      state: existing?.state ?? 'planning',
      currentRole: existing?.currentRole ?? 'analysis',
      handoffs: existing?.handoffs ?? [],
      verificationReports: existing?.verificationReports ?? [],
      reviewDecisions: existing?.reviewDecisions ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(existing?.implementationContract
        ? { implementationContract: existing.implementationContract }
        : {}),
    };
    this._dependencies.repository.saveGoal(goal);
    return goal;
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
    const goal = this.requireGoal(workItemId);
    if (
      decision === 'approved' &&
      !goal.verificationReports.some((report) => report.state === 'passed')
    ) {
      throw new Error('A goal needs passing verification evidence before approval.');
    }
    const now = this._dependencies.clock.now();
    const review: IGoalReviewDecision = {
      id: this._dependencies.ids.next('review'),
      recordedAt: now,
      decision,
      message: message.trim(),
    };
    const updated: IGoalRecord = {
      ...goal,
      state:
        decision === 'approved'
          ? 'achieved'
          : decision === 'revision-required'
            ? 'revision-required'
            : 'blocked',
      currentRole: decision === 'revision-required' ? 'solution' : 'pull-request-review',
      reviewDecisions: [...goal.reviewDecisions, review],
      ...(decision === 'blocked'
        ? { blockedReason: review.message }
        : { blockedReason: undefined }),
      updatedAt: now,
    };
    this._dependencies.repository.saveGoal(updated);
    await this._dependencies.publishAcceptanceNote(updated, review);
    return updated;
  }

  /** Resolves immutable bindings and the delegated goal for a run. @public */
  public executionScope(
    workItem: IWorkItem,
    role: SkillFlowRole,
  ): Pick<IExecutionRecord, 'workspaceId' | 'bindingSnapshot'> {
    const existingGoal = this.goalForWorkItem(workItem.id);
    const bindingSnapshot = this._dependencies.bindingSnapshotFor?.(
      workItem,
      role,
      existingGoal?.assignment.agentTeamId,
    );
    if (workItem.workspaceId && !bindingSnapshot) {
      throw new Error(
        `Workspace ${workItem.workspaceId} requires a complete delivery context before execution.`,
      );
    }
    if (bindingSnapshot) this.ensureGoal(workItem, bindingSnapshot);
    return {
      ...(workItem.workspaceId ? { workspaceId: workItem.workspaceId } : {}),
      ...(bindingSnapshot ? { bindingSnapshot } : {}),
    };
  }

  /** Reads the delegated goal for one Work Item. @public */
  public goalForWorkItem(workItemId: string): IGoalRecord | undefined {
    return this._dependencies.repository
      .listGoals()
      .find((candidate) => candidate.workItemId === workItemId);
  }

  private requireGoal(workItemId: string): IGoalRecord {
    const goal = this.goalForWorkItem(workItemId);
    if (!goal) throw new Error(`No AI goal is delegated for work item ${workItemId}.`);
    return goal;
  }

  private ensureGoal(workItem: IWorkItem, binding: IExecutionBindingSnapshot): IGoalRecord {
    const existing = this.goalForWorkItem(workItem.id);
    if (existing) return existing;
    const now = this._dependencies.clock.now();
    const deliveryGroup = this._dependencies.activeDeliveryGroupForRoot(workItem.id);
    const assignment = this._dependencies.goalAssignmentFor?.(
      workItem,
      binding.agentTeamId,
      binding.agentProfileId,
    ) ?? {
      agentTeamId: binding.agentTeamId,
      responsibleAgentId: binding.agentProfileId,
    };
    const goal: IGoalRecord = {
      id: this._dependencies.ids.next('goal'),
      workspaceId: binding.workspaceId,
      workItemId: workItem.id,
      ...(deliveryGroup
        ? {
            deliveryGroupId: deliveryGroup.id,
            workItemIds: deliveryGroup.workItemIds,
            workItemRevisions: deliveryGroup.revisions,
          }
        : {}),
      assignment: {
        id: this._dependencies.ids.next('assignment'),
        workspaceId: binding.workspaceId,
        workItemId: workItem.id,
        ...assignment,
        objective: workItem.title,
        assignedAt: now,
        updatedAt: now,
      },
      state: 'planning',
      currentRole: 'analysis',
      handoffs: [],
      verificationReports: [],
      reviewDecisions: [],
      createdAt: now,
      updatedAt: now,
    };
    this._dependencies.repository.saveGoal(goal);
    return goal;
  }

  /** Records the role and run currently advancing a goal. @public */
  public updateGoalExecution(
    execution: IExecutionRecord,
    state: IGoalRecord['state'],
    role: SkillFlowRole,
  ): void {
    const goal = this.goalForWorkItem(execution.workItemId);
    if (!goal) return;
    this._dependencies.repository.saveGoal({
      ...goal,
      ...(execution.deliveryGroupId
        ? {
            deliveryGroupId: execution.deliveryGroupId,
            workItemIds: execution.workItemIds,
            workItemRevisions: execution.workItemRevisions,
          }
        : {}),
      state,
      currentRole: role,
      currentExecutionId: execution.id,
      executingAgentId: execution.bindingSnapshot?.agentProfileId,
      blockedReason: undefined,
      updatedAt: this._dependencies.clock.now(),
    });
  }

  /** Combines approved instructions with the live implementing-position policy. @public */
  /**
   * The stored goal contract carries the approved instructions and acceptance criteria, but its
   * policy-derived boundaries were captured when the goal was created — historically from the
   * read-only analysis position, which allows no changes at all. The change budget and path
   * boundaries therefore always come from the live policy of the position executing this
   * solution, and the healed contract is persisted back onto the goal by the solve loop.
   */
  public effectiveImplementationContract(
    execution: IExecutionRecord,
    goal: IGoalRecord | undefined,
    analysis: string,
  ): IImplementationContract {
    const policyContract = this.implementationContract(execution, analysis);
    const stored = goal?.implementationContract;
    if (!stored) return policyContract;
    return {
      ...stored,
      allowedPathPatterns: policyContract.allowedPathPatterns,
      forbiddenPathPatterns: policyContract.forbiddenPathPatterns,
      maximumChangedFiles: policyContract.maximumChangedFiles,
      maximumDiffLines: policyContract.maximumDiffLines,
    };
  }

  /** Builds the bounded implementation contract for an execution. @public */
  public implementationContract(
    execution: IExecutionRecord,
    analysis: string,
  ): IImplementationContract {
    // Only a position that implements may bound the implementation. Goals store their contract
    // when the read-only analysis position finishes, and that position's deliberate zero change
    // budget must never travel into the contract that later binds the implementing position.
    const binding = execution.bindingSnapshot;
    const policy =
      binding && (binding.skillFlowRole === 'solution' || binding.skillFlowRole === 'ci-repair')
        ? this._dependencies.positionPolicyFor?.(binding.positionId)
        : undefined;
    return {
      id: this._dependencies.ids.next('contract'),
      version: 1,
      createdByExecutionId: execution.id,
      createdAt: this._dependencies.clock.now(),
      ...(execution.deliveryGroupId
        ? {
            deliveryGroupId: execution.deliveryGroupId,
            workItemIds: execution.workItemIds,
            workItemRevisions: execution.workItemRevisions,
            acceptanceCriteriaByWorkItem: Object.fromEntries(
              (execution.workItemSnapshots ?? []).map((item) => [
                item.id,
                [`${item.externalId}: ${item.title}`],
              ]),
            ),
          }
        : {}),
      instructions: analysis,
      acceptanceCriteria: extractAcceptanceCriteria(analysis),
      allowedPathPatterns: policy?.allowedPathPatterns ?? ['**'],
      forbiddenPathPatterns: policy?.forbiddenPathPatterns ?? [
        '.git/**',
        '.env',
        '.env.*',
        '**/credentials/**',
      ],
      allowedCommands: ['git status', 'git diff', 'yarn', 'npm', 'pnpm', 'nx'],
      maximumChangedFiles: policy?.maximumChangedFiles ?? 100,
      maximumDiffLines: policy?.maximumDiffLines ?? 20_000,
    };
  }

  /** Records the contract accepted with a manual analysis. @public */
  public recordManualAnalysisGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    normalizedSummary: string,
    now: string,
  ): void {
    this._dependencies.repository.saveGoal({
      ...manualGoal,
      state: 'ready',
      currentRole: 'solution',
      currentExecutionId: execution.id,
      implementationContract: this.implementationContract(execution, normalizedSummary),
      updatedAt: now,
    });
  }

  /** Retains the missing-verification evidence of a manual implementation. @public */
  public recordManualSolutionGoal(
    manualGoal: IGoalRecord,
    execution: IExecutionRecord,
    verificationReport: IGoalVerificationReport,
    now: string,
  ): void {
    this._dependencies.repository.saveGoal({
      ...manualGoal,
      state: 'blocked',
      currentRole: 'solution',
      currentExecutionId: execution.id,
      verificationReports: [...manualGoal.verificationReports, verificationReport],
      blockedReason: verificationReport.message,
      updatedAt: now,
    });
  }

  /** Makes a completed analysis available for implementation. @public */
  public recordAnalysisGoal(goal: IGoalRecord, completed: IExecutionRecord, summary: string): void {
    this._dependencies.repository.saveGoal({
      ...goal,
      state: 'ready',
      currentRole: 'solution',
      currentExecutionId: completed.id,
      executingAgentId: completed.bindingSnapshot?.agentProfileId,
      implementationContract: this.implementationContract(completed, summary),
      updatedAt: this._dependencies.clock.now(),
    });
  }

  /** Records verification evidence and the resulting goal state. @public */
  public recordVerifiedGoal(
    goal: IGoalRecord,
    current: IExecutionRecord,
    contract: IImplementationContract,
    verificationReport: IGoalVerificationReport,
    failures: readonly string[],
    repairing: boolean,
  ): void {
    this._dependencies.repository.saveGoal({
      ...goal,
      state: repairing ? 'implementing' : failures.length ? 'blocked' : 'reviewing',
      currentRole: failures.length ? 'solution' : 'pull-request-review',
      currentExecutionId: current.id,
      executingAgentId: this._dependencies.latestExecution(current.id).bindingSnapshot
        ?.agentProfileId,
      implementationContract: contract,
      verificationReports: [...goal.verificationReports, verificationReport],
      ...(failures.length && !repairing ? { blockedReason: failures.join(' ') } : {}),
      updatedAt: this._dependencies.clock.now(),
    });
  }

  /** Preserves a route substitution and its remaining implementation work. @public */
  public recordGoalHandoff(
    goal: IGoalRecord,
    executionId: string,
    previousAgentId: string,
    nextAgentId: string,
    changeSet: { readonly changedFiles: readonly string[] },
    now: string,
  ): void {
    this._dependencies.repository.saveGoal({
      ...goal,
      executingAgentId: nextAgentId,
      handoffs: [
        ...goal.handoffs,
        {
          id: this._dependencies.ids.next('handoff'),
          occurredAt: now,
          fromAgentId: previousAgentId,
          toAgentId: nextAgentId,
          reason: 'The previous AI route failed and the configured substitute took over.',
          executionId,
          changedFiles: changeSet.changedFiles,
          completedChecks: [],
          openSteps: ['Continue the current contract in the preserved managed worktree.'],
        },
      ],
      updatedAt: now,
    });
  }

  /** Blocks a goal on the terminal failure of its current execution. @public */
  public recordFailedGoal(goal: IGoalRecord, failed: IExecutionRecord, error: string): void {
    this._dependencies.repository.saveGoal({
      ...goal,
      state: 'blocked',
      currentExecutionId: failed.id,
      executingAgentId: failed.bindingSnapshot?.agentProfileId,
      blockedReason: error,
      updatedAt: this._dependencies.clock.now(),
    });
  }

  // #endregion
}
