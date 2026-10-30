// #region Imports

import type {
  AutomationReceiptState,
  IAgenticDeliveryPolicy,
  IAgenticDeliveryRecord,
  IAutomationReceipt,
  IAutomationSignal,
} from '@symphony/domain-automation';
import type { CiFailureClassification, ICiRun, ICiRunDetails } from '@symphony/domain-ci';
import type { IPullRequestStatus } from '@symphony/domain-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import {
  findStage,
  stageExecutesRole,
  type IRunResult,
  type IVerificationReport,
} from '@symphony/domain-workflow';
import type { IAutomationExecutionTrigger } from './IAutomationExecutionTrigger';
import type { IAutomationServiceDependencies } from './IAutomationServiceDependencies';
import type { IAutomationSynchronizationResult } from './IAutomationSynchronizationResult';
import type { IAutonomousCycleResult } from './IAutonomousCycleResult';
import type { IPullRequestQualification } from './IPullRequestQualification';
const terminalReceiptStates = new Set<AutomationReceiptState>([
  'baselined',
  'started',
  'completed',
  'ignored',
  'failed',
]);

const autonomyExclusionLabel = 'autonomy:excluded';

const managedBranchInspectionLimit = 20;

const unknownBaseStatusSampleThreshold = 5;

// #endregion

/** Change surface an in-flight managed pull-request delivery still occupies. */
interface IInFlightDeliverySurface {
  readonly pullRequestNumber: number;
  readonly workItemId: string;
  readonly memberIds: ReadonlySet<string>;
  readonly surface: ReadonlySet<string>;
}

/**
 * Durable policy for translating provider-neutral remote signals into bounded executions.
 *
 * @public
 */
export class AutomationService {
  // #region Fields

  private _synchronization?: Promise<IAutomationSynchronizationResult>;
  private _autonomousCycle?: Promise<IAutonomousCycleResult>;
  private readonly _cycleInspectedStatuses = new Map<string, IPullRequestStatus>();
  private readonly _pullRequestQualifications = new Map<string, IPullRequestQualification>();
  private readonly _unknownBaseStatusStreaks = new Map<string, number>();

  // #endregion

  // #region Ctor

  /**
   * Binds the tracker, execution, durable recovery and policy dependencies used by automation.
   *
   * @param _dependencies - Provider-neutral effects and bounded automation policy.
   * @public
   */
  public constructor(private readonly _dependencies: IAutomationServiceDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the synchronize.
   *
   * @public
   */
  public synchronize(): Promise<IAutomationSynchronizationResult> {
    if (this._synchronization) return this._synchronization;
    const operation = this.synchronizeOnce().finally(() => {
      if (this._synchronization === operation) this._synchronization = undefined;
    });
    this._synchronization = operation;
    return operation;
  }

  /**
   * Runs the autonomous cycle.
   *
   * @public
   */
  public runAutonomousCycle(): Promise<IAutonomousCycleResult> {
    if (this._autonomousCycle) return this._autonomousCycle;
    const operation = this.runAutonomousCycleOnce().finally(() => {
      if (this._autonomousCycle === operation) this._autonomousCycle = undefined;
    });
    this._autonomousCycle = operation;
    return operation;
  }

  /**
   * Last-observed base qualification of every managed pull request this service inspected.
   *
   * @public
   */
  public listPullRequestQualifications(): readonly IPullRequestQualification[] {
    return [...this._pullRequestQualifications.values()];
  }

  private async runAutonomousCycleOnce(): Promise<IAutonomousCycleResult> {
    this._cycleInspectedStatuses.clear();
    const result: IAutonomousCycleResult = {
      observed: 0,
      excluded: 0,
      active: 0,
      capacity: 0,
      queueStarted: 0,
      queuePending: 0,
      reviewed: 0,
      completed: 0,
      startedAnalyses: 0,
      startedSolutions: 0,
      retried: 0,
      deferred: 0,
      failed: 0,
      agenticObserved: 0,
      agenticDiagnoses: 0,
      agenticRepairs: 0,
      agenticReruns: 0,
      agenticBranchUpdates: 0,
      failureSamples: [],
    };
    const agenticPolicy = this._dependencies.agenticDeliveryPolicy?.();
    const agenticEnabled = Boolean(agenticPolicy?.enabled && agenticPolicy.observeFailures);
    if (!this._dependencies.autonomyEnabled?.() && !agenticEnabled) return result;

    let workItems = [
      ...(await (this._dependencies.listWorkItems?.() ??
        this._dependencies.tracker.listWorkItems())),
    ];
    result.observed = workItems.length;
    if (agenticEnabled && agenticPolicy) {
      await this.processAgenticDeliveries(workItems, agenticPolicy, result);
      await this.updateManagedPullRequestBranches(workItems, agenticPolicy, result);
    }
    if (!this._dependencies.autonomyEnabled?.()) return result;
    workItems = await this.synchronizePullRequests(workItems, result);
    const policyEligibleWorkItems = workItems.filter(
      (item) => !this.isAutonomyExcluded(item) && !this.isHeldByWorkflow(item),
    );
    result.excluded = workItems.length - policyEligibleWorkItems.length;
    const eligibleWorkItems = policyEligibleWorkItems.filter(
      (item) => item.assistanceAction !== 'create',
    );

    // The queue is served before the board: it holds decisions that were already made, and
    // only the capacity it leaves behind is autonomy's to spend.
    result.queueStarted = (await this._dependencies.executionQueue?.drain()) ?? 0;
    result.queuePending = this._dependencies.executionQueue?.pending() ?? 0;

    const executions = this._dependencies.executionRepository.listExecutions();
    result.active = executions.filter((execution) => this.usesExecutionCapacity(execution)).length;
    const limit = Math.max(1, Math.floor(this._dependencies.maxParallelExecutions?.() ?? 3));
    result.capacity = Math.max(0, limit - result.active);
    if (!result.capacity) return result;

    const inFlightDeliveries = agenticPolicy?.conflictSerializationEnabled
      ? this.inFlightDeliverySurfaces(workItems)
      : [];
    const historyByWorkItem = new Map<string, readonly IExecutionRecord[]>();
    for (const item of eligibleWorkItems) {
      historyByWorkItem.set(item.id, this.history(item.id));
    }
    const ordered = [...eligibleWorkItems].sort((left, right) =>
      (left.createdAt ?? left.id).localeCompare(right.createdAt ?? right.id),
    );
    const workflow = this._dependencies.workflow();
    const failed = ordered.filter(
      (item) => this.isAutomatable(item) && historyByWorkItem.get(item.id)?.[0]?.state === 'failed',
    );
    const implementable = ordered.filter((item) => {
      if (
        !stageExecutesRole(workflow.stages, item.stageId, 'solve') ||
        item.assistanceAction === 'analyze' ||
        item.assistanceAction === 'create'
      )
        return false;
      const history = historyByWorkItem.get(item.id) ?? [];
      return Boolean(history[0] && this.isSuccessfulAnalysis(history[0]));
    });
    const analyzable = ordered.filter((item) => {
      const history = historyByWorkItem.get(item.id) ?? [];
      if (history.some(this.isExecutionActive) || history[0]?.state === 'failed') return false;
      if (item.assistanceAction === 'solve' || item.assistanceAction === 'create') return false;
      return (
        stageExecutesRole(workflow.stages, item.stageId, 'analyze') ||
        item.assistanceAction === 'analyze'
      );
    });

    const scheduled = new Set<string>();
    for (const item of this.interleaveCandidates(failed, implementable, analyzable)) {
      if (result.capacity <= 0 || scheduled.has(item.id)) break;
      scheduled.add(item.id);
      const latest = historyByWorkItem.get(item.id)?.[0];
      try {
        if (latest?.state === 'failed') {
          // A retry repeats the step in the stage that owns it; it never moves the item.
          const retryItem = item;
          await this._dependencies.storageAdmission?.(retryItem, 'analysis');
          await this._dependencies.executions.startForWorkItem(
            retryItem,
            latest.request ??
              (latest.kind === undefined || latest.kind === 'analysis'
                ? 'Re-analyze the work item after the failed analysis.'
                : 'Re-analyze the work item and correct the plan after the failed implementation.'),
            { origin: 'autonomy' },
          );
          result.startedAnalyses += 1;
          if (retryItem !== item) {
            const index = workItems.findIndex((candidate) => candidate.id === item.id);
            if (index >= 0) workItems[index] = retryItem;
          }
          result.retried += 1;
        } else if (
          stageExecutesRole(workflow.stages, item.stageId, 'solve') &&
          item.assistanceAction !== 'analyze'
        ) {
          // Serialization defers a predicted collision instead of starting it; the deferral
          // spends no capacity, so the slot stays available for non-colliding work.
          const blocking = this.blockingInFlightDelivery(item, inFlightDeliveries);
          if (blocking) {
            result.deferred += 1;
            if (result.failureSamples.length < 10) {
              result.failureSamples = [
                ...result.failureSamples,
                {
                  workItemId: item.id,
                  externalId: item.externalId,
                  message: `Deferred: the predicted change surface overlaps in-flight pull request #${blocking.pullRequestNumber} for work item ${blocking.workItemId}.`,
                },
              ];
            }
            continue;
          }
          const hasPreviousSolution = (historyByWorkItem.get(item.id) ?? []).some((execution) =>
            this.isSuccessfulSolution(execution),
          );
          await this._dependencies.storageAdmission?.(item, 'implementation');
          await this._dependencies.executions.startSolutionForWorkItem(
            item,
            hasPreviousSolution
              ? 'Apply the latest autonomous re-analysis and correct the previous implementation.'
              : undefined,
            { origin: 'autonomy' },
          );
          result.startedSolutions += 1;
        } else {
          await this._dependencies.storageAdmission?.(item, 'analysis');
          await this._dependencies.executions.startForWorkItem(item, undefined, {
            origin: 'autonomy',
          });
          result.startedAnalyses += 1;
        }
        result.capacity -= 1;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unknown autonomous failure.';
        if (this.isDeferrable(message)) result.deferred += 1;
        else {
          result.failed += 1;
          if (result.failureSamples.length < 10) {
            result.failureSamples = [
              ...result.failureSamples,
              { workItemId: item.id, externalId: item.externalId, message },
            ];
          }
        }
      }
    }
    return result;
  }

  /**
   * Reports the verification outcome of every delivered pull request to the supervisor.
   *
   * Synchronization only proves facts: the pull-request state, the commit it points at, and
   * the deterministic verification the successful solve run already carries. The supervisor
   * routes those facts through the configured transition and its guards; this service never
   * writes a stage to the tracker itself.
   */
  private async synchronizePullRequests(
    workItems: readonly IWorkItem[],
    result: IAutonomousCycleResult,
  ): Promise<IWorkItem[]> {
    const delivery = this._dependencies.delivery;
    const reporter = this._dependencies.workflowReporter;
    if (!delivery || !reporter) return [...workItems];
    const synchronized: IWorkItem[] = [];
    const strandedMembers: IWorkItem[] = [];
    for (const item of workItems) {
      const execution = this.history(item.id).find(
        (candidate) => this.isSuccessfulSolution(candidate) && candidate.pullRequest,
      );
      const workflow = this._dependencies.workflow();
      if (!execution?.pullRequest || !stageExecutesRole(workflow.stages, item.stageId, 'verify')) {
        if (!execution?.pullRequest && stageExecutesRole(workflow.stages, item.stageId, 'verify')) {
          strandedMembers.push(item);
        }
        synchronized.push(item);
        continue;
      }
      try {
        const status = await this.inspectPullRequestOnce(execution, item);
        await this.completeDeliveryGroup(execution, workItems, status);
        const report = this.verificationRunResult(item, execution, status);
        if (!report) {
          synchronized.push(item);
          continue;
        }
        const record = await reporter.applyRunResult(item, report);
        const stageId = record?.stageId ?? item.stageId;
        if (stageId === item.stageId) {
          synchronized.push(item);
          continue;
        }
        synchronized.push({ ...item, stageId });
        // A move into a gate means the work now waits for a person; a move into a terminal
        // stage means it is finished.
        if (findStage(workflow.stages, stageId)?.kind === 'terminal') {
          result.completed += 1;
        } else {
          result.reviewed += 1;
        }
      } catch {
        result.failed += 1;
        synchronized.push(item);
      }
    }
    await this.synchronizeGroupedMembers(strandedMembers, workItems, synchronized, result);
    return synchronized;
  }

  /**
   * Routes grouped members through the verification the root pull request already proved.
   *
   * History matches executions by their root work item only, so after a grouped delivery the
   * members carry no pull-request execution of their own and would strand in their stage. The
   * root's inspected status is reused per tick; the root itself is never reported twice here
   * because it always finds its own execution in the main pass.
   */
  private async synchronizeGroupedMembers(
    members: readonly IWorkItem[],
    workItems: readonly IWorkItem[],
    synchronized: IWorkItem[],
    result: IAutonomousCycleResult,
  ): Promise<void> {
    const reporter = this._dependencies.workflowReporter;
    if (!reporter || members.length === 0) return;
    const groups = this._dependencies.executionRepository.listDeliveryGroups();
    for (const member of members) {
      const group = groups.find(
        (candidate) =>
          candidate.state !== 'dissolved' &&
          candidate.rootWorkItemId !== member.id &&
          candidate.workItemIds.includes(member.id),
      );
      if (!group) continue;
      const execution = this.history(group.rootWorkItemId).find(
        (candidate) =>
          this.isSuccessfulSolution(candidate) &&
          candidate.pullRequest &&
          candidate.deliveryGroupId === group.id,
      );
      if (!execution?.pullRequest) continue;
      try {
        const rootItem = workItems.find((candidate) => candidate.id === group.rootWorkItemId);
        const status = await this.inspectPullRequestOnce(execution, rootItem ?? member);
        const report = this.verificationRunResult(member, execution, status);
        if (!report) continue;
        const record = await reporter.applyRunResult(member, report);
        const stageId = record?.stageId ?? member.stageId;
        if (stageId === member.stageId) continue;
        const index = synchronized.findIndex((candidate) => candidate.id === member.id);
        if (index >= 0) synchronized[index] = { ...member, stageId };
        if (findStage(this._dependencies.workflow().stages, stageId)?.kind === 'terminal') {
          result.completed += 1;
        } else {
          result.reviewed += 1;
        }
      } catch {
        result.failed += 1;
      }
    }
  }

  /**
   * Inspects one pull request at most once per autonomous tick and records its qualification.
   *
   * Grouped deliveries let several work items share one pull request, and the managed-branch
   * pass runs before synchronization in the same cycle; the shared cache keeps every consumer
   * on the single observation a tick actually made.
   */
  private async inspectPullRequestOnce(
    execution: IExecutionRecord,
    item: IWorkItem,
  ): Promise<IPullRequestStatus> {
    const pullRequestNumber = execution.pullRequest!.number;
    const workspaceId = execution.workspaceId ?? item.workspaceId;
    const key = `${workspaceId}:${pullRequestNumber}`;
    const cached = this._cycleInspectedStatuses.get(key);
    if (cached) return cached;
    const status = await this._dependencies.delivery!.inspectPullRequest(execution, item);
    this._cycleInspectedStatuses.set(key, status);
    if (workspaceId) {
      this._pullRequestQualifications.set(key, {
        workspaceId,
        pullRequestNumber,
        workItemId: execution.workItemId,
        baseBranchStatus: status.baseBranchStatus,
        observedAt: this._dependencies.clock.now(),
      });
    }
    return status;
  }

  private async completeDeliveryGroup(
    execution: IExecutionRecord,
    workItems: readonly IWorkItem[],
    status: IPullRequestStatus,
  ): Promise<void> {
    if (status.state !== 'merged' || !execution.deliveryGroupId) return;
    const group = this._dependencies.executionRepository
      .listDeliveryGroups()
      .find((candidate) => candidate.id === execution.deliveryGroupId);
    if (!group || group.state === 'dissolved') return;
    const now = this._dependencies.clock.now();
    const completed =
      group.state === 'completed'
        ? group
        : {
            ...group,
            state: 'completed' as const,
            completedAt: now,
            updatedAt: now,
          };
    if (group.state !== 'completed')
      this._dependencies.executionRepository.saveDeliveryGroup(completed);
    const memberIds = new Set(completed.workItemIds);
    await this._dependencies.tracker.synchronizeDeliveryGroup?.(
      completed,
      workItems.filter((workItem) => memberIds.has(workItem.id)),
    );
  }

  /**
   * The verification outcome an inspected pull request proves.
   *
   * A succeeded solve run is hard evidence that the deterministic repository verification
   * passed: the run fails before reporting success when contract scope or any deterministic
   * check fails. The verdict binds to the head commit observed now, so the guards accept it
   * only while that commit is still current. A draft is still being worked on and proves
   * nothing; a closed pull request proves the implementation is gone.
   */
  private verificationRunResult(
    item: IWorkItem,
    execution: IExecutionRecord,
    status: IPullRequestStatus,
  ): IRunResult | undefined {
    if (status.state === 'open' && status.draft) return undefined;
    const now = this._dependencies.clock.now();
    const pullRequestNumber = execution.pullRequest!.number;
    if (status.state === 'closed') {
      return {
        runId: `verify-${execution.id}`,
        role: 'verify',
        outcome: 'rework',
        reasonCode: 'verification-failed',
        summary: `Pull request #${pullRequestNumber} was closed without merging, so the delivered implementation no longer exists.`,
        evidence: [],
        finishedAt: now,
      };
    }
    const goal = this._dependencies.executionRepository
      .listGoals()
      .find((candidate) => candidate.workItemId === item.id);
    const deterministic = goal?.verificationReports
      .filter((report) => report.executionId === execution.id)
      .at(-1);
    // A recorded failed deterministic verification (a manual implementation note, for
    // example) is not proof; the goal stays blocked and a person resolves it.
    if (deterministic && deterministic.state === 'failed') return undefined;
    const headCommitSha = status.headCommitSha ?? `pull-request-${pullRequestNumber}`;
    const merged = status.state === 'merged';
    const acceptanceCriteria = goal?.implementationContract?.acceptanceCriteria ?? [];
    const verification: IVerificationReport = {
      commitSha: headCommitSha,
      // The record carries the authoritative analysis revision; this report proves the
      // commit-bound verdict, not the plan lineage.
      analysisRevision: '',
      passed: true,
      acceptanceEvidence: (acceptanceCriteria.length
        ? acceptanceCriteria
        : ['Implement the approved analysis without scope drift.']
      ).map((criterion) => ({
        acceptanceCriterion: criterion,
        satisfied: true,
        evidence: 'Deterministic repository verification passed for the delivered implementation.',
      })),
      findings: [],
      unexpectedChanges: [],
      continuousIntegrationPassed: merged,
    };
    return {
      runId: `verify-${execution.id}`,
      role: 'verify',
      outcome: 'pass',
      summary: merged
        ? `Pull request #${pullRequestNumber} is merged and the deterministic verification of the delivered implementation passed.`
        : `Pull request #${pullRequestNumber} is delivered for review and the deterministic verification of the delivered implementation passed.`,
      evidence: (deterministic?.checks ?? []).map((check) => ({
        label: check.label,
        detail: check.state,
      })),
      revisions: { verifiedCommitSha: headCommitSha },
      pullRequest: {
        id: String(pullRequestNumber),
        headCommitSha,
        checksPassed: merged,
        merged,
        targetBranchContainsCommit: merged,
      },
      verification,
      finishedAt: now,
    };
  }

  private async processAgenticDeliveries(
    workItems: readonly IWorkItem[],
    policy: IAgenticDeliveryPolicy,
    result: IAutonomousCycleResult,
  ): Promise<void> {
    const ci = this._dependencies.ci;
    if (!ci?.getRunDetails) return;
    const runs = await ci.listRuns('operational');
    const enabledRuns = runs.filter((run) =>
      this._dependencies.agenticDeliveryEnabledFor?.(run.workspaceId, run.repositoryBindingId),
    );
    const checkpoints = this._dependencies.repository.listAutomationCheckpoints();
    const initializedBindings = new Set(
      checkpoints
        .filter((checkpoint) => checkpoint.sourceId.startsWith('agentic-ci:'))
        .map((checkpoint) => `${checkpoint.workspaceId}:${checkpoint.sourceId.slice(11)}`),
    );
    const now = this._dependencies.clock.now();

    for (const run of enabledRuns.filter((candidate) => candidate.status === 'failed')) {
      const bindingKey = `${run.workspaceId}:${run.ciBindingId}`;
      const source = this.sourceExecutionForRun(run);
      if (!source?.pullRequest) continue;
      const item = workItems.find((candidate) => candidate.id === source.workItemId);
      if (!item) continue;
      result.agenticObserved += 1;
      const runAttempt = run.runAttempt ?? 1;
      const id = this.agenticDeliveryId(run, runAttempt);
      let delivery = this._dependencies.repository
        .listAgenticDeliveries()
        .find((candidate) => candidate.id === id);
      if (!initializedBindings.has(bindingKey)) {
        if (!delivery) {
          delivery = this.newAgenticDelivery(run, source, runAttempt, 'baseline', now);
          this._dependencies.repository.saveAgenticDelivery({
            ...delivery,
            state: 'stopped',
            message: 'Existing failed run recorded as the agentic-delivery baseline.',
          });
        }
        continue;
      }
      if (
        delivery &&
        (delivery.state === 'stopped' ||
          delivery.state === 'resolved' ||
          delivery.state === 'failed' ||
          delivery.state === 'awaiting-ci')
      ) {
        continue;
      }
      try {
        const evidence = await ci.getRunDetails(run.id);
        await this.reconcileAgenticDelivery(
          delivery ?? this.newAgenticDelivery(run, source, runAttempt, '', now),
          item,
          source,
          evidence,
          policy,
          result,
        );
      } catch (cause) {
        const failed = delivery ?? this.newAgenticDelivery(run, source, runAttempt, '', now);
        this._dependencies.repository.saveAgenticDelivery({
          ...failed,
          state: 'deferred',
          updatedAt: now,
          message:
            cause instanceof Error ? cause.message : 'CI evidence is temporarily unavailable.',
        });
        result.deferred += 1;
      }
    }

    for (const run of enabledRuns) {
      const bindingKey = `${run.workspaceId}:${run.ciBindingId}`;
      if (initializedBindings.has(bindingKey)) continue;
      this._dependencies.repository.saveAutomationCheckpoint({
        sourceId: `agentic-ci:${run.ciBindingId}`,
        workspaceId: run.workspaceId,
        initializedAt: now,
        synchronizedAt: now,
      });
      initializedBindings.add(bindingKey);
    }

    for (const delivery of this._dependencies.repository
      .listAgenticDeliveries()
      .filter((candidate) => candidate.state === 'awaiting-ci')) {
      const succeedingRun = enabledRuns
        .filter(
          (run) =>
            run.workspaceId === delivery.workspaceId &&
            run.repositoryBindingId === delivery.repositoryBindingId &&
            run.branch === delivery.branch &&
            run.status === 'succeeded' &&
            this.runTimestamp(run) > delivery.updatedAt,
        )
        .sort((left, right) => this.runTimestamp(right).localeCompare(this.runTimestamp(left)))[0];
      if (!succeedingRun) continue;
      this._dependencies.repository.saveAgenticDelivery({
        ...delivery,
        state: 'resolved',
        updatedAt: now,
        message: `A later CI run succeeded (${succeedingRun.id}).`,
      });
    }
  }

  /**
   * Advances retained Symphony-managed pull-request branches that lag behind their base.
   *
   * This is part of agentic delivery rather than general board autonomy: repository opt-in and
   * the explicit managed-branch policy both apply, and a provider conflict remains untouched for
   * a revision instead of being hidden by a force push.
   */
  private async updateManagedPullRequestBranches(
    workItems: readonly IWorkItem[],
    policy: IAgenticDeliveryPolicy,
    result: IAutonomousCycleResult,
  ): Promise<void> {
    const delivery = this._dependencies.delivery;
    if (!policy.managedBranchUpdatesEnabled || !delivery?.updatePullRequestBranch) return;
    const claimed = new Set<string>();
    const candidates: {
      readonly item: IWorkItem;
      readonly execution: IExecutionRecord;
      readonly workspaceId: string;
    }[] = [];
    for (const item of workItems) {
      const execution = this.history(item.id).find(
        (candidate) => this.isSuccessfulSolution(candidate) && candidate.pullRequest,
      );
      if (!execution?.pullRequest || !execution.workspaceReference) continue;
      const workspaceId = execution.workspaceId ?? item.workspaceId;
      if (!workspaceId) continue;
      const key = `${workspaceId}:${execution.pullRequest.number}`;
      if (claimed.has(key)) continue;
      const bindingIds =
        execution.bindingSnapshot?.repositoryBindingIds ?? item.repositoryBindingIds ?? [];
      if (
        this._dependencies.agenticDeliveryEnabledFor &&
        !bindingIds.some((bindingId) =>
          this._dependencies.agenticDeliveryEnabledFor!(workspaceId, bindingId),
        )
      ) {
        continue;
      }
      claimed.add(key);
      candidates.push({ item, execution, workspaceId });
    }
    // Oldest deliveries first, and a bounded number per cycle: a large backlog must not
    // monopolize the single-flighted autonomous cycle with provider round trips.
    const ordered = [...candidates].sort((left, right) =>
      left.execution.startedAt.localeCompare(right.execution.startedAt),
    );
    for (const { item, execution, workspaceId } of ordered.slice(0, managedBranchInspectionLimit)) {
      const key = `${workspaceId}:${execution.pullRequest!.number}`;
      try {
        const status = await this.inspectPullRequestOnce(execution, item);
        this.trackUnknownBaseStatus(key, item, execution.pullRequest!.number, status, result);
        const branchDeliveries = this._dependencies.repository
          .listAgenticDeliveries()
          .filter(
            (candidate) =>
              candidate.ciRunId.startsWith('managed-branch:') &&
              candidate.workspaceId === workspaceId &&
              candidate.pullRequestNumber === execution.pullRequest!.number,
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        if (status.baseBranchStatus === 'current') {
          const awaiting = branchDeliveries.find((candidate) => candidate.state === 'awaiting-ci');
          if (awaiting) {
            this._dependencies.repository.saveAgenticDelivery({
              ...awaiting,
              state: 'resolved',
              updatedAt: this._dependencies.clock.now(),
              message: 'The managed pull-request branch now includes its current base.',
            });
          }
          continue;
        }
        if (
          status.baseBranchStatus === 'conflicting' &&
          status.headCommitSha &&
          status.state === 'open' &&
          !status.draft &&
          status.sourceBranch === execution.workspaceReference
        ) {
          await this.reconcileManagedBranchConflict(
            item,
            execution,
            status.headCommitSha,
            policy,
            branchDeliveries,
            result,
          );
          continue;
        }
        if (
          status.state !== 'open' ||
          status.draft ||
          status.baseBranchStatus !== 'behind' ||
          !status.headCommitSha ||
          status.sourceBranch !== execution.workspaceReference
        ) {
          continue;
        }
        await delivery.updatePullRequestBranch(execution, item, status.headCommitSha);
        this._cycleInspectedStatuses.delete(key);
        result.agenticBranchUpdates += 1;
      } catch (cause) {
        if (this.isStaleExpectedHead(cause)) continue;
        result.failed += 1;
        if (result.failureSamples.length < 10) {
          result.failureSamples = [
            ...result.failureSamples,
            {
              workItemId: item.id,
              externalId: item.externalId,
              message:
                cause instanceof Error
                  ? cause.message
                  : 'The managed pull-request branch could not be updated.',
            },
          ];
        }
      }
    }
  }

  /**
   * Records how long GitHub has consecutively withheld mergeability for one pull request.
   *
   * A single unknown observation is normal while GitHub computes mergeability in the
   * background; a persistent streak is surfaced as a sample so the operator sees it, without
   * counting a failure. Any definitive status ends the streak.
   */
  private trackUnknownBaseStatus(
    key: string,
    item: IWorkItem,
    pullRequestNumber: number,
    status: IPullRequestStatus,
    result: IAutonomousCycleResult,
  ): void {
    if (status.baseBranchStatus !== 'unknown') {
      if (status.baseBranchStatus) this._unknownBaseStatusStreaks.delete(key);
      return;
    }
    const streak = (this._unknownBaseStatusStreaks.get(key) ?? 0) + 1;
    this._unknownBaseStatusStreaks.set(key, streak);
    if (streak < unknownBaseStatusSampleThreshold || result.failureSamples.length >= 10) return;
    result.failureSamples = [
      ...result.failureSamples,
      {
        workItemId: item.id,
        externalId: item.externalId,
        message: `GitHub has not reported mergeability for pull request #${pullRequestNumber} across ${streak} consecutive inspections.`,
      },
    ];
  }

  /**
   * GitHub rejects a stale expected head on update-branch with HTTP 422: the head moved
   * between inspection and update, so the next cycle re-inspects instead of failing.
   */
  private isStaleExpectedHead(cause: unknown): boolean {
    return cause instanceof Error && /HTTP 422/u.test(cause.message);
  }

  /**
   * Change surfaces of every delivery whose managed pull request is still in flight.
   *
   * A delivery observed merged or closed this tick occupies nothing anymore; one without an
   * observation this tick is treated as in flight while its work item has not reached a
   * terminal stage. The measured changed files of the delivered implementation are preferred
   * over the analyzer prediction whenever a verification report persisted them.
   */
  private inFlightDeliverySurfaces(
    workItems: readonly IWorkItem[],
  ): readonly IInFlightDeliverySurface[] {
    const workflow = this._dependencies.workflow();
    const surfaces: IInFlightDeliverySurface[] = [];
    const seen = new Set<string>();
    for (const item of workItems) {
      if (findStage(workflow.stages, item.stageId)?.kind === 'terminal') continue;
      const execution = this.history(item.id).find(
        (candidate) => this.isSuccessfulSolution(candidate) && candidate.pullRequest,
      );
      if (!execution?.pullRequest) continue;
      const workspaceId = execution.workspaceId ?? item.workspaceId;
      const key = `${workspaceId}:${execution.pullRequest.number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const observed = this._cycleInspectedStatuses.get(key);
      if (observed && observed.state !== 'open') continue;
      const surface = this.deliveryChangeSurface(execution);
      if (surface.size === 0) continue;
      surfaces.push({
        pullRequestNumber: execution.pullRequest.number,
        workItemId: execution.workItemId,
        memberIds: new Set(execution.workItemIds ?? [execution.workItemId]),
        surface,
      });
    }
    return surfaces;
  }

  private deliveryChangeSurface(execution: IExecutionRecord): ReadonlySet<string> {
    const goal = this._dependencies.executionRepository
      .listGoals()
      .find((candidate) => candidate.workItemId === execution.workItemId);
    const measured = goal?.verificationReports
      .filter((report) => report.executionId === execution.id)
      .at(-1)?.changedFiles;
    if (measured?.length) return new Set(measured);
    const predicted = this._dependencies.workflowRecord?.(execution.workItemId)?.analysis
      ?.likelyChangeSurface;
    return new Set(predicted ?? []);
  }

  private blockingInFlightDelivery(
    item: IWorkItem,
    deliveries: readonly IInFlightDeliverySurface[],
  ): IInFlightDeliverySurface | undefined {
    if (deliveries.length === 0) return undefined;
    const predicted =
      this._dependencies.workflowRecord?.(item.id)?.analysis?.likelyChangeSurface ?? [];
    if (predicted.length === 0) return undefined;
    return deliveries.find(
      (delivery) =>
        !delivery.memberIds.has(item.id) && predicted.some((path) => delivery.surface.has(path)),
    );
  }

  /** Starts or reconciles one deterministic base-conflict revision on the retained branch. */
  private async reconcileManagedBranchConflict(
    item: IWorkItem,
    source: IExecutionRecord,
    headCommitSha: string,
    policy: IAgenticDeliveryPolicy,
    previous: readonly IAgenticDeliveryRecord[],
    result: IAutonomousCycleResult,
  ): Promise<void> {
    const workspaceId = source.workspaceId ?? item.workspaceId;
    const branch = source.workspaceReference;
    if (!workspaceId || !branch) {
      throw new Error('The managed pull-request workspace identity is unavailable.');
    }
    if (!policy.sourceRepairEnabled || !this._dependencies.executions.startAgenticDeliveryRepair) {
      throw new Error(
        `Pull request #${source.pullRequest!.number} conflicts with its base branch; enable source repair to resolve it autonomously.`,
      );
    }
    const id = `managed-branch:${source.workspaceId}:${source.pullRequest!.number}:${headCommitSha}`;
    const existingDelivery = previous.find((candidate) => candidate.id === id);
    const repair = existingDelivery?.repairExecutionId
      ? this._dependencies.executionRepository
          .listExecutions()
          .find((execution) => execution.id === existingDelivery.repairExecutionId)
      : undefined;
    if (repair) {
      if (this.isExecutionActive(repair)) return;
      this._dependencies.repository.saveAgenticDelivery({
        ...existingDelivery!,
        state: repair.state === 'succeeded' ? 'awaiting-ci' : 'failed',
        updatedAt: this._dependencies.clock.now(),
        message:
          repair.state === 'succeeded'
            ? 'The base conflict revision was delivered; waiting for provider reconciliation.'
            : (repair.error ?? 'The base conflict revision failed.'),
      });
      return;
    }
    if (
      existingDelivery &&
      existingDelivery.state !== 'deferred' &&
      existingDelivery.state !== 'observed'
    ) {
      return;
    }
    const attempt = Math.max(0, ...previous.map((candidate) => candidate.attempt)) + 1;
    if (attempt > policy.maxAttempts) {
      throw new Error(
        `Pull request #${source.pullRequest!.number} still conflicts after ${policy.maxAttempts} managed revision attempts.`,
      );
    }
    if (!this.withinAgenticBudget(policy, policy.repairTokenBudget)) {
      throw new Error('The remaining daily token budget cannot fund the base conflict revision.');
    }
    const activeRepairs = this._dependencies.executionRepository
      .listExecutions()
      .filter(
        (execution) => execution.skillFlowRole === 'ci-repair' && this.isExecutionActive(execution),
      ).length;
    if (activeRepairs >= policy.maxParallelRepairs) return;
    const now = this._dependencies.clock.now();
    const delivery: IAgenticDeliveryRecord = {
      id,
      workspaceId,
      repositoryBindingId: source.bindingSnapshot?.repositoryBindingIds[0] ?? 'managed-branch',
      ciRunId: id,
      runAttempt: 1,
      revision: headCommitSha,
      branch,
      pullRequestNumber: source.pullRequest!.number,
      workItemId: item.id,
      sourceExecutionId: source.id,
      state: 'repairing',
      classification: 'source',
      fingerprint: `base-conflict:${headCommitSha}`,
      attempt,
      observedAt: now,
      updatedAt: now,
      message: 'The managed pull-request branch conflicts with its current base.',
    };
    this._dependencies.repository.saveAgenticDelivery(delivery);
    const diagnosis: IExecutionRecord = {
      id: `${id}:diagnosis`,
      workspaceId,
      workItemId: item.id,
      // A grouped source delivered every member through one pull request, so the conflict
      // revision keeps the combined scope instead of shrinking it to the root item.
      ...(source.deliveryGroupId ? { deliveryGroupId: source.deliveryGroupId } : {}),
      ...(source.workItemIds ? { workItemIds: source.workItemIds } : {}),
      ...(source.workItemRevisions ? { workItemRevisions: source.workItemRevisions } : {}),
      ...(source.workItemSnapshots ? { workItemSnapshots: source.workItemSnapshots } : {}),
      workflowId: source.workflowId,
      kind: 'analysis',
      mode: 'manual',
      state: 'succeeded',
      startedAt: now,
      finishedAt: now,
      summary:
        'GitHub deterministically reports that the managed pull-request head conflicts with its current base branch.',
      parentExecutionId: source.id,
      workspacePath: source.workspacePath,
      workspaceReference: branch,
      preserveWorkspace: true,
      automationOrigin: 'agentic-delivery',
      agenticDeliveryId: id,
    };
    this._dependencies.executionRepository.saveExecution(diagnosis);
    const evidence: ICiRunDetails = {
      runId: id,
      jobs: [
        {
          id: 'managed-branch-update',
          name: 'Update managed pull-request branch',
          status: 'failed',
          steps: [{ id: 'base-conflict', name: 'Resolve base conflict', status: 'failed' }],
        },
      ],
      failureLog: [
        `Pull request #${source.pullRequest!.number} cannot be updated automatically because its current base conflicts with head ${headCommitSha}.`,
        'Fetch the configured base branch and merge it into the retained managed branch without rebasing or force-pushing.',
        'Resolve every conflict while preserving the approved implementation and the current base behavior, then run the repository checks.',
      ].join('\n'),
    };
    await this._dependencies.storageAdmission?.(item, 'implementation');
    const started = await this._dependencies.executions.startAgenticDeliveryRepair(
      item,
      source,
      diagnosis,
      delivery,
      evidence,
      policy,
    );
    this._dependencies.repository.saveAgenticDelivery({
      ...delivery,
      repairExecutionId: started.id,
      updatedAt: this._dependencies.clock.now(),
    });
    result.agenticRepairs += 1;
  }

  private async reconcileAgenticDelivery(
    delivery: IAgenticDeliveryRecord,
    item: IWorkItem,
    source: IExecutionRecord,
    evidence: ICiRunDetails,
    policy: IAgenticDeliveryPolicy,
    result: IAutonomousCycleResult,
  ): Promise<void> {
    const now = this._dependencies.clock.now();
    const executions = this._dependencies.executionRepository.listExecutions();
    const diagnosis = delivery.diagnosisExecutionId
      ? executions.find((execution) => execution.id === delivery.diagnosisExecutionId)
      : executions.find(
          (execution) =>
            execution.agenticDeliveryId === delivery.id &&
            execution.skillFlowRole === 'ci-diagnosis',
        );
    const repair = delivery.repairExecutionId
      ? executions.find((execution) => execution.id === delivery.repairExecutionId)
      : executions.find(
          (execution) =>
            execution.agenticDeliveryId === delivery.id && execution.skillFlowRole === 'ci-repair',
        );
    if ((diagnosis && !delivery.diagnosisExecutionId) || (repair && !delivery.repairExecutionId)) {
      delivery = {
        ...delivery,
        ...(diagnosis ? { diagnosisExecutionId: diagnosis.id } : {}),
        ...(repair ? { repairExecutionId: repair.id } : {}),
        updatedAt: now,
      };
      this._dependencies.repository.saveAgenticDelivery(delivery);
    }

    if (delivery.state === 'repairing' && repair) {
      if (this.isExecutionActive(repair)) return;
      this._dependencies.repository.saveAgenticDelivery({
        ...delivery,
        state: repair.state === 'succeeded' ? 'awaiting-ci' : 'failed',
        updatedAt: now,
        message:
          repair.state === 'succeeded'
            ? 'Repair was delivered; waiting for the next CI result.'
            : (repair.error ?? 'The repair execution did not complete successfully.'),
      });
      return;
    }

    const classification = delivery.classification ?? this.classifyCiFailure(evidence);
    const fingerprint = this.failureFingerprint(evidence, classification);
    delivery = {
      ...delivery,
      classification,
      fingerprint,
      state: delivery.state === 'observed' ? 'classified' : delivery.state,
      updatedAt: now,
      message: `Failure classified as ${classification}.`,
    };
    this._dependencies.repository.saveAgenticDelivery(delivery);

    if (delivery.attempt > policy.maxAttempts) {
      this.stopAgenticDelivery(delivery, 'Maximum repair attempts reached.');
      return;
    }
    const previousMatch = this._dependencies.repository
      .listAgenticDeliveries()
      .filter(
        (candidate) =>
          candidate.id !== delivery.id &&
          candidate.branch === delivery.branch &&
          candidate.fingerprint === fingerprint &&
          candidate.state !== 'stopped',
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    const cooldownMilliseconds = Math.max(0, policy.cooldownMinutes) * 60_000;
    if (
      previousMatch &&
      Date.parse(now) - Date.parse(previousMatch.updatedAt) < cooldownMilliseconds
    ) {
      this._dependencies.repository.saveAgenticDelivery({
        ...delivery,
        state: 'deferred',
        updatedAt: now,
        message: 'An identical failure is inside the configured cooldown window.',
      });
      return;
    }
    if (classification === 'authorization') {
      this.stopAgenticDelivery(delivery, 'Authorization failures require operator action.');
      return;
    }
    if (classification === 'infrastructure' || classification === 'transient') {
      if (policy.ciRerunEnabled && !delivery.rerunRequestedAt && this._dependencies.ci?.rerun) {
        const requested = {
          ...delivery,
          state: 'awaiting-ci' as const,
          rerunRequestedAt: now,
          updatedAt: now,
        };
        this._dependencies.repository.saveAgenticDelivery(requested);
        await this._dependencies.ci.rerun(delivery.ciRunId);
        result.agenticReruns += 1;
      } else if (!delivery.rerunRequestedAt) {
        this.stopAgenticDelivery(
          delivery,
          `${classification} failures are not source-repair candidates.`,
        );
      }
      return;
    }
    if (!policy.aiDiagnosisEnabled) {
      this.stopAgenticDelivery(delivery, 'AI diagnosis is disabled by policy.');
      return;
    }
    if (!this.withinAgenticBudget(policy, policy.diagnosisTokenBudget)) {
      this._dependencies.repository.saveAgenticDelivery({
        ...delivery,
        state: 'deferred',
        updatedAt: now,
        message: 'The daily agentic-delivery token budget is exhausted.',
      });
      return;
    }

    if (!diagnosis) {
      if (!this._dependencies.executions.startAgenticDeliveryDiagnosis) {
        throw new Error('Agentic CI diagnosis is not available.');
      }
      const diagnosing = { ...delivery, state: 'diagnosing' as const, updatedAt: now };
      this._dependencies.repository.saveAgenticDelivery(diagnosing);
      await this._dependencies.storageAdmission?.(item, 'analysis');
      const started = await this._dependencies.executions.startAgenticDeliveryDiagnosis(
        item,
        source,
        diagnosing,
        evidence,
        policy,
      );
      this._dependencies.repository.saveAgenticDelivery({
        ...diagnosing,
        diagnosisExecutionId: started.id,
        updatedAt: this._dependencies.clock.now(),
      });
      result.agenticDiagnoses += 1;
      return;
    }
    if (this.isExecutionActive(diagnosis)) return;
    if (diagnosis.state !== 'succeeded' || !diagnosis.summary) {
      this._dependencies.repository.saveAgenticDelivery({
        ...delivery,
        state: 'failed',
        updatedAt: now,
        message: diagnosis.error ?? 'CI diagnosis did not complete successfully.',
      });
      return;
    }
    if ((diagnosis.tokenUsage?.total ?? 0) > policy.diagnosisTokenBudget) {
      this.stopAgenticDelivery(delivery, 'The CI diagnosis exceeded its token budget.');
      return;
    }
    const repairAllowed =
      policy.managedBranchUpdatesEnabled &&
      ((classification === 'workflow' && policy.workflowRepairEnabled) ||
        ((classification === 'source' || classification === 'unknown') &&
          policy.sourceRepairEnabled));
    if (!repairAllowed) {
      this.stopAgenticDelivery(delivery, 'Diagnosis completed; repair is disabled for this class.');
      return;
    }
    if (!repair) {
      if (!this.withinAgenticBudget(policy, policy.repairTokenBudget)) {
        this._dependencies.repository.saveAgenticDelivery({
          ...delivery,
          state: 'deferred',
          updatedAt: now,
          message: 'The remaining daily token budget cannot fund a repair.',
        });
        return;
      }
      if (!this._dependencies.executions.startAgenticDeliveryRepair) {
        throw new Error('Agentic CI repair is not available.');
      }
      const activeRepairs = executions.filter(
        (execution) => execution.skillFlowRole === 'ci-repair' && this.isExecutionActive(execution),
      ).length;
      if (activeRepairs >= policy.maxParallelRepairs) return;
      const repairing = { ...delivery, state: 'repairing' as const, updatedAt: now };
      this._dependencies.repository.saveAgenticDelivery(repairing);
      await this._dependencies.storageAdmission?.(item, 'implementation');
      const started = await this._dependencies.executions.startAgenticDeliveryRepair(
        item,
        source,
        diagnosis,
        repairing,
        evidence,
        policy,
      );
      this._dependencies.repository.saveAgenticDelivery({
        ...repairing,
        repairExecutionId: started.id,
        updatedAt: this._dependencies.clock.now(),
      });
      result.agenticRepairs += 1;
    }
  }

  private sourceExecutionForRun(run: ICiRun): IExecutionRecord | undefined {
    return this._dependencies.executionRepository
      .listExecutions()
      .filter(
        (execution) =>
          (execution.kind === 'solution' || execution.kind === 'revision') &&
          execution.state === 'succeeded' &&
          execution.pullRequest &&
          execution.workspaceId === run.workspaceId &&
          execution.workspaceReference === run.branch &&
          (execution.bindingSnapshot?.repositoryBindingIds.includes(run.repositoryBindingId) ??
            true),
      )
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  }

  private newAgenticDelivery(
    run: ICiRun,
    source: IExecutionRecord,
    runAttempt: number,
    fingerprint: string,
    now: string,
  ): IAgenticDeliveryRecord {
    const previousAttempts = this._dependencies.repository
      .listAgenticDeliveries()
      .filter(
        (candidate) =>
          candidate.workspaceId === run.workspaceId &&
          candidate.repositoryBindingId === run.repositoryBindingId &&
          candidate.branch === run.branch &&
          candidate.fingerprint !== 'baseline',
      );
    return {
      id: this.agenticDeliveryId(run, runAttempt),
      workspaceId: run.workspaceId,
      repositoryBindingId: run.repositoryBindingId,
      ciRunId: run.id,
      runAttempt,
      ...(run.revision ? { revision: run.revision } : {}),
      ...(run.branch ? { branch: run.branch } : {}),
      pullRequestNumber: source.pullRequest!.number,
      workItemId: source.workItemId,
      sourceExecutionId: source.id,
      state: 'observed',
      fingerprint,
      attempt: Math.max(0, ...previousAttempts.map((candidate) => candidate.attempt)) + 1,
      observedAt: now,
      updatedAt: now,
    };
  }

  private agenticDeliveryId(run: ICiRun, runAttempt: number): string {
    return `agentic:${run.workspaceId}:${run.repositoryBindingId}:${run.id}:${runAttempt}`;
  }

  private classifyCiFailure(evidence: ICiRunDetails): CiFailureClassification {
    const text =
      `${evidence.jobs.flatMap((job) => [job.name, ...job.steps.map((step) => step.name)]).join('\n')}\n${evidence.failureLog ?? ''}`.toLowerCase();
    if (/no space left|enospc|disk quota|runner.*(lost|offline)/u.test(text))
      return 'infrastructure';
    if (/timed out|timeout|502|503|connection reset|service unavailable/u.test(text))
      return 'transient';
    if (
      /resource not accessible|permission denied|forbidden|unauthorized|bad credentials/u.test(text)
    )
      return 'authorization';
    if (/workflow.*(invalid|syntax)|yaml|action not found|unable to resolve action/u.test(text))
      return 'workflow';
    if (/test|lint|type.?check|compile|build/u.test(text)) return 'source';
    return 'unknown';
  }

  private failureFingerprint(
    evidence: ICiRunDetails,
    classification: NonNullable<IAgenticDeliveryRecord['classification']>,
  ): string {
    const failed = evidence.jobs.flatMap((job) =>
      job.steps
        .filter((step) => step.status === 'failed')
        .map((step) => `${job.name}/${step.name}`),
    );
    const signature =
      `${classification}:${failed.join('|')}:${(evidence.failureLog ?? '').slice(-512)}`
        .toLowerCase()
        .replaceAll(/\s+/gu, ' ');
    let hash = 2_166_136_261;
    for (const character of signature) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }
    return `${classification}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  private withinAgenticBudget(policy: IAgenticDeliveryPolicy, requested = 0): boolean {
    const today = this._dependencies.clock.now().slice(0, 10);
    const used = this._dependencies.executionRepository
      .listExecutions()
      .filter(
        (execution) =>
          execution.automationOrigin === 'agentic-delivery' &&
          execution.startedAt.startsWith(today),
      )
      .reduce((total, execution) => total + (execution.tokenUsage?.total ?? 0), 0);
    return used + requested <= policy.dailyTokenBudget;
  }

  private stopAgenticDelivery(delivery: IAgenticDeliveryRecord, message: string): void {
    this._dependencies.repository.saveAgenticDelivery({
      ...delivery,
      state: 'stopped',
      updatedAt: this._dependencies.clock.now(),
      message,
    });
  }

  /**
   * Whether automation may act on the item at all. Only an automated stage qualifies: a human
   * gate is waiting for a decision and a terminal stage is finished, so automation must leave
   * both alone rather than move the item out of them.
   */
  private isAutomatable(item: IWorkItem): boolean {
    return findStage(this._dependencies.workflow().stages, item.stageId)?.kind === 'automated';
  }

  private isSuccessfulAnalysis(execution: IExecutionRecord): boolean {
    return (
      (execution.kind === undefined || execution.kind === 'analysis') &&
      (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis') &&
      execution.state === 'succeeded' &&
      Boolean(execution.summary)
    );
  }

  private isSuccessfulSolution(execution: IExecutionRecord): boolean {
    return (
      (execution.kind === 'solution' || execution.kind === 'revision') &&
      execution.state === 'succeeded'
    );
  }

  private isExecutionActive(execution: IExecutionRecord): boolean {
    return (
      execution.state === 'queued' || execution.state === 'running' || execution.state === 'waiting'
    );
  }

  private usesExecutionCapacity(execution: IExecutionRecord): boolean {
    return this.isExecutionActive(execution) && execution.pause?.reason !== 'operator';
  }

  private isAutonomyExcluded(item: IWorkItem): boolean {
    return item.labels.some((label) => label.trim().toLowerCase() === autonomyExclusionLabel);
  }

  /**
   * Whether the workflow record parks this item. A scheduled retry belongs to the workflow
   * scheduler and its backoff; blocked, human-required, and quarantined items wait for their
   * condition or a person. Autonomy starting them anyway would bypass the routing policy.
   */
  private isHeldByWorkflow(item: IWorkItem): boolean {
    const record = this._dependencies.workflowRecord?.(item.id);
    if (!record) return false;
    return (
      record.runtimeState === 'retry-wait' ||
      record.runtimeState === 'blocked' ||
      record.runtimeState === 'human-required' ||
      record.runtimeState === 'quarantined'
    );
  }

  private interleaveCandidates(
    failed: readonly IWorkItem[],
    ready: readonly IWorkItem[],
    backlog: readonly IWorkItem[],
  ): readonly IWorkItem[] {
    const lanes = [failed, ready, backlog];
    const candidates: IWorkItem[] = [];
    const rounds = Math.max(...lanes.map((lane) => lane.length));
    for (let index = 0; index < rounds; index += 1) {
      for (const lane of lanes) {
        const candidate = lane[index];
        if (candidate) candidates.push(candidate);
      }
    }
    return candidates;
  }

  private async synchronizeOnce(): Promise<IAutomationSynchronizationResult> {
    const result: IAutomationSynchronizationResult = {
      observed: 0,
      baselined: 0,
      started: 0,
      completed: 0,
      deferred: 0,
      ignored: 0,
      failed: 0,
    };
    if (!this._dependencies.enabled() || !this._dependencies.tracker.listAutomationSignals) {
      return result;
    }

    const synchronizedAt = this._dependencies.clock.now();
    const checkpoints = this._dependencies.repository.listAutomationCheckpoints();
    const signals = [...(await this._dependencies.tracker.listAutomationSignals(checkpoints))].sort(
      (a, b) => a.occurredAt.localeCompare(b.occurredAt),
    );
    result.observed = signals.length;
    const sources = this._dependencies.tracker.listAutomationSources
      ? await this._dependencies.tracker.listAutomationSources()
      : signals.map((signal) => ({ sourceId: signal.sourceId, workspaceId: signal.workspaceId }));
    const knownSources = new Set(checkpoints.map((checkpoint) => this.sourceKey(checkpoint)));
    const incomingSources = new Set(sources.map((source) => this.sourceKey(source)));

    for (const sourceKey of incomingSources) {
      if (knownSources.has(sourceKey)) continue;
      for (const signal of signals.filter((candidate) => this.sourceKey(candidate) === sourceKey)) {
        this.save(
          signal,
          'baselined',
          'Existing GitHub state recorded as the automation baseline.',
        );
        result.baselined += 1;
      }
      const source = sources.find((candidate) => this.sourceKey(candidate) === sourceKey)!;
      this._dependencies.repository.saveAutomationCheckpoint({
        ...source,
        initializedAt: synchronizedAt,
        synchronizedAt,
      });
      knownSources.add(sourceKey);
    }

    for (const signal of signals) {
      const existing = this._dependencies.repository
        .listAutomationReceipts()
        .find((receipt) => receipt.signalId === signal.id);
      if (existing && terminalReceiptStates.has(existing.state)) continue;
      if (existing?.state === 'processing') {
        const execution = this._dependencies.executionRepository
          .listExecutions()
          .find((candidate) => candidate.automationSignalId === signal.id);
        if (execution) {
          this.save(
            signal,
            'started',
            'Recovered the execution started by this signal.',
            execution.id,
          );
          result.started += 1;
          continue;
        }
      }
      await this.process(signal, result);
    }
    for (const source of sources) {
      const checkpoint = checkpoints.find(
        (candidate) => this.sourceKey(candidate) === this.sourceKey(source),
      );
      this._dependencies.repository.saveAutomationCheckpoint({
        ...source,
        initializedAt: checkpoint?.initializedAt ?? synchronizedAt,
        synchronizedAt,
      });
    }
    return result;
  }

  private async process(
    signal: IAutomationSignal,
    result: IAutomationSynchronizationResult,
  ): Promise<void> {
    this.save(signal, 'processing', 'Remote instruction accepted for policy evaluation.');
    try {
      const execution = await this.execute(signal);
      if (execution) {
        this.save(signal, 'started', 'Remote instruction started an execution.', execution.id);
        result.started += 1;
        await this.acknowledge(signal, 'started');
        return;
      }
      this.save(signal, 'completed', 'Remote instruction completed without an agent execution.');
      result.completed += 1;
      await this.acknowledge(signal, 'completed');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unknown automation failure.';
      if (this.isDeferrable(message)) {
        this.save(signal, 'deferred', message);
        result.deferred += 1;
        await this.acknowledge(signal, 'deferred');
        return;
      }
      if (this.isIgnorable(message)) {
        this.save(signal, 'ignored', message);
        result.ignored += 1;
        await this.acknowledge(signal, 'ignored');
        return;
      }
      this.save(signal, 'failed', message);
      result.failed += 1;
      await this.acknowledge(signal, 'failed');
    }
  }

  private async execute(signal: IAutomationSignal): Promise<IExecutionRecord | undefined> {
    const history = this.history(signal.workItem.id);
    switch (signal.action) {
      case 'analyze':
        return this._dependencies.executions.startForWorkItem(
          signal.workItem,
          signal.request,
          this.remoteTrigger(signal),
        );
      case 'solve':
        return this._dependencies.executions.startSolutionForWorkItem(
          signal.workItem,
          signal.request ?? 'Apply the requested GitHub follow-up.',
          this.remoteTrigger(signal),
        );
      case 'retry': {
        const failed = history.find((execution) => execution.state === 'failed');
        if (!failed) throw new Error('There is no failed execution to retry.');
        return failed.kind === undefined || failed.kind === 'analysis'
          ? this._dependencies.executions.startForWorkItem(
              signal.workItem,
              signal.request ?? failed.request,
              this.remoteTrigger(signal),
            )
          : this._dependencies.executions.startSolutionForWorkItem(
              signal.workItem,
              signal.request ?? failed.request ?? 'Retry the failed implementation.',
              this.remoteTrigger(signal),
            );
      }
      case 'rerun-ci':
        await this.rerunFailedCi(signal, history);
        return undefined;
      case 'synchronize':
        return this.synchronizeWorkItem(signal, history);
    }
  }

  private synchronizeWorkItem(
    signal: IAutomationSignal,
    history: readonly IExecutionRecord[],
  ): Promise<IExecutionRecord> {
    if (!signal.workItem.stageId) {
      throw new Error(
        'The board column of this work item is not mapped to a workflow stage. Map it in the board settings.',
      );
    }
    if (!this.isAutomatable(signal.workItem)) {
      throw new Error('Work items in a terminal stage do not start automatic executions.');
    }
    const analysis = history.find(
      (execution) =>
        (execution.kind === undefined || execution.kind === 'analysis') &&
        (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis') &&
        execution.state === 'succeeded',
    );
    if (
      !analysis ||
      stageExecutesRole(this._dependencies.workflow().stages, signal.workItem.stageId, 'analyze')
    ) {
      return this._dependencies.executions.startForWorkItem(
        signal.workItem,
        signal.request ?? 'Re-read the updated GitHub issue and replace the previous analysis.',
        this.remoteTrigger(signal),
      );
    }
    return this._dependencies.executions.startSolutionForWorkItem(
      signal.workItem,
      signal.request ??
        'The GitHub issue changed. Re-read its current title and body, then update the implementation accordingly.',
      this.remoteTrigger(signal),
    );
  }

  private async rerunFailedCi(
    signal: IAutomationSignal,
    history: readonly IExecutionRecord[],
  ): Promise<void> {
    if (!this._dependencies.ci?.rerun) throw new Error('CI reruns are not available.');
    const runs = await this._dependencies.ci.listRuns();
    const bindingIds = new Set(signal.workItem.repositoryBindingIds ?? []);
    const branch = history.find((execution) => execution.workspaceReference)?.workspaceReference;
    const run = [...runs]
      .filter(
        (candidate) =>
          candidate.workspaceId === signal.workspaceId &&
          candidate.status === 'failed' &&
          (!bindingIds.size || bindingIds.has(candidate.repositoryBindingId)) &&
          (!branch || !candidate.branch || candidate.branch === branch),
      )
      .sort((left, right) => this.runTimestamp(right).localeCompare(this.runTimestamp(left)))[0];
    if (!run) throw new Error('No failed GitHub Actions run matches this work item.');
    await this._dependencies.ci.rerun(run.id);
  }

  private runTimestamp(run: ICiRun): string {
    return run.finishedAt ?? run.startedAt ?? '';
  }

  private history(workItemId: string): readonly IExecutionRecord[] {
    return this._dependencies.executionRepository
      .listExecutions()
      .filter((execution) => execution.workItemId === workItemId)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  private save(
    signal: IAutomationSignal,
    state: AutomationReceiptState,
    message: string,
    executionId?: string,
  ): void {
    const now = this._dependencies.clock.now();
    const existing = this._dependencies.repository
      .listAutomationReceipts()
      .find((receipt) => receipt.signalId === signal.id);
    this._dependencies.repository.saveAutomationReceipt({
      signalId: signal.id,
      sourceId: signal.sourceId,
      workspaceId: signal.workspaceId,
      workItemId: signal.workItem.id,
      action: signal.action,
      state,
      observedAt: existing?.observedAt ?? now,
      updatedAt: now,
      ...(executionId ? { executionId } : {}),
      message,
    });
  }

  private sourceKey(
    value: Pick<IAutomationSignal | IAutomationReceipt, 'workspaceId' | 'sourceId'>,
  ): string {
    return `${value.workspaceId}:${value.sourceId}`;
  }

  private async acknowledge(
    signal: IAutomationSignal,
    state: AutomationReceiptState,
  ): Promise<void> {
    if (signal.origin !== 'comment' || !this._dependencies.tracker.acknowledgeAutomationSignal) {
      return;
    }
    try {
      await this._dependencies.tracker.acknowledgeAutomationSignal(signal, state);
    } catch {
      // Acknowledgement is best-effort; the durable local receipt remains authoritative.
    }
  }

  private isDeferrable(message: string): boolean {
    return /already running|already being created|claimed by another Symphony instance|is not active in this Symphony session|Execution capacity is full/iu.test(
      message,
    );
  }

  private remoteTrigger(signal: IAutomationSignal): IAutomationExecutionTrigger {
    return {
      origin: 'remote',
      signalId: signal.id,
      ...(signal.actorLogin ? { actorLogin: signal.actorLogin } : {}),
    };
  }

  private isIgnorable(message: string): boolean {
    return /There is no failed execution|Completed work items|No failed GitHub Actions run/iu.test(
      message,
    );
  }

  // #endregion
}
