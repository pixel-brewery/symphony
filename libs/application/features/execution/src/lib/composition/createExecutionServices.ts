// #region Imports

import type {
  ExecutionState,
  IExecutionEvent,
  IExecutionRecord,
  IDeliveryGroup,
  IGoalRecord,
  IGoalReviewDecision,
  IImplementationContract,
  IGoalVerificationReport,
} from '@symphony/domain-execution';
import type { ProcessRole, RunOutcome } from '@symphony/domain-workflow';
import type { SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem, IWorkItemClaim, IWorkItemNote } from '@symphony/domain-work';
import { AgentInterruptionError } from '@symphony/application-ai';
import type { IExecutionTrigger as IAutomationExecutionTrigger } from '../ports/IExecutionTrigger';
import type { IAnalyzerDependencies } from '../analyzer/IAnalyzerDependencies';
import type { IPullRequestReference } from '@symphony/domain-delivery';
import type { GroupClaimAdmission } from '../claims/GroupClaimAdmission';
import type { IExecutionLifecycle } from '../lifecycle/IExecutionLifecycle';
import { ExecutionLifecycleService } from '../lifecycle/ExecutionLifecycleService';
import type { IExecutionAdmission } from '../admission/IExecutionAdmission';
import { ExecutionAdmissionService } from '../admission/ExecutionAdmissionService';
import type { IExecutionGoals } from '../goals/IExecutionGoals';
import { ExecutionGoalService } from '../goals/ExecutionGoalService';
import type { IDeliveryGroups } from '../groups/IDeliveryGroups';
import { DeliveryGroupService } from '../groups/DeliveryGroupService';
import type { IExecutionWorkspaces } from '../workspace/IExecutionWorkspaces';
import { ExecutionWorkspaceService } from '../workspace/ExecutionWorkspaceService';
import type { IExecutionStarts } from '../starting/IExecutionStarts';
import { ExecutionStartService } from '../starting/ExecutionStartService';
import type { IManualExecutions } from '../manual/IManualExecutions';
import { ManualExecutionService } from '../manual/ManualExecutionService';
import type { IExecutionRuns } from '../run/IExecutionRuns';
import { ExecutionRunService } from '../run/ExecutionRunService';
import type { IExecutionClaims } from '../claims/IExecutionClaims';
import { ExecutionClaimService } from '../claims/ExecutionClaimService';
import type { IExecutionPublication } from '../publication/IExecutionPublication';
import { ExecutionPublicationService } from '../publication/ExecutionPublicationService';
import type { IExecutionWorkflow } from '../workflow/IExecutionWorkflow';
import { ExecutionWorkflowService } from '../workflow/ExecutionWorkflowService';
import type { IExecutionEvents } from '../events/IExecutionEvents';
import { ExecutionEventService } from '../events/ExecutionEventService';
import type { IExecutionServices } from './IExecutionServices';

// #endregion

/**
 * Composes one owner for each execution responsibility.
 *
 * Deferred callbacks form a mediator between narrow contracts without duplicating session state.
 * @param _dependencies - Existing provider and persistence capabilities.
 * @public
 */
export function createExecutionServices(_dependencies: IAnalyzerDependencies): IExecutionServices {
  const lifecycle: IExecutionLifecycle = new ExecutionLifecycleService({
    repository: _dependencies.repository,
    clock: _dependencies.clock,
    tracker: _dependencies.tracker,
    workspace: _dependencies.workspace,
    recoveryDelay: _dependencies.recoveryDelay,
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    withQueueDrainSuspended: <T>(operation: () => Promise<T>) =>
      admission.withQueueDrainSuspended(operation),
    executionCapacity: () => admission.executionCapacity(),
    pendingExecutionStarts: () => admission.pendingExecutionStarts(),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
    reserveExecutionCapacity: () => admission.reserveExecutionCapacity(),
    releaseExecutionCapacity: () => admission.releaseExecutionCapacity(),
    resumeRequestedOperatorExecutions: () => admission.resumeRequestedOperatorExecutions(),
    drainExecutionQueue: () => admission.drainExecutionQueue(),
    isSemanticFailure: (summary: string | undefined) => run.isSemanticFailure(summary),
    finalizeWorkspace: (execution: IExecutionRecord) => workspace.finalizeWorkspace(execution),
    cleanupEligibleWorkspaces: () => workspace.cleanupEligibleWorkspaces(),
    completeAgenticDiagnosisInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) => run.completeAgenticDiagnosisInBackground(execution, item, simulateFailure, signal),
    completeInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) => run.completeInBackground(execution, item, simulateFailure, signal),
    completeSolutionInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      analysis: string,
      feedback: string | undefined,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) =>
      run.completeSolutionInBackground(
        execution,
        item,
        analysis,
        feedback,
        simulateFailure,
        signal,
      ),
    reportRunResult: (
      item: IWorkItem,
      role: ProcessRole,
      execution: IExecutionRecord,
      outcome: RunOutcome,
      summary: string,
    ) => workflow.reportRunResult(item, role, execution, outcome, summary),
    goalForWorkItem: (workItemId: string) => goals.goalForWorkItem(workItemId),
    recordFailedGoal: (goal: IGoalRecord, failed: IExecutionRecord, error: string) =>
      goals.recordFailedGoal(goal, failed, error),
    releaseWorkItemClaim: (claim: IWorkItemClaim) => claims.releaseWorkItemClaim(claim),
  });
  const admission: IExecutionAdmission = new ExecutionAdmissionService({
    maxParallelExecutions: _dependencies.maxParallelExecutions,
    repository: _dependencies.repository,
    queueDrainAllowed: _dependencies.queueDrainAllowed,
    clock: _dependencies.clock,
    authorizeLocalExecution: _dependencies.authorizeLocalExecution,
    ids: _dependencies.ids,
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    assertStageAllowsRole: (item: IWorkItem, role: ProcessRole) =>
      workflow.assertStageAllowsRole(item, role),
    workflow: () => workflow.workflow(),
    isActive: (state: ExecutionState) => lifecycle.isActive(state),
    resumeExecution: (executionId: string) => lifecycle.resumeExecution(executionId),
    startAnalysis: (
      simulateFailure: boolean,
      workItemId?: string,
      request?: string,
      automationTrigger?: IAutomationExecutionTrigger,
      executionApproval?: 'once' | 'repository',
    ) =>
      starting.startAnalysis(
        simulateFailure,
        workItemId,
        request,
        automationTrigger,
        executionApproval,
      ),
    startSolver: (
      simulateFailure: boolean,
      workItemId: string,
      feedback?: string,
      automationTrigger?: IAutomationExecutionTrigger,
      executionApproval?: 'once' | 'repository',
    ) =>
      starting.startSolver(
        simulateFailure,
        workItemId,
        feedback,
        automationTrigger,
        executionApproval,
      ),
  });
  const goals: IExecutionGoals = new ExecutionGoalService({
    repository: _dependencies.repository,
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    goalAssignmentFor: _dependencies.goalAssignmentFor,
    clock: _dependencies.clock,
    ids: _dependencies.ids,
    bindingSnapshotFor: _dependencies.bindingSnapshotFor,
    positionPolicyFor: _dependencies.positionPolicyFor,
    publishAcceptanceNote: (goal: IGoalRecord, review: IGoalReviewDecision) =>
      publication.publishAcceptanceNote(goal, review),
    activeDeliveryGroupForRoot: (workItemId: string) =>
      groups.activeDeliveryGroupForRoot(workItemId),
    latestExecution: (executionId: string) => lifecycle.latestExecution(executionId),
  });
  const groups: IDeliveryGroups = new DeliveryGroupService({
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    repository: _dependencies.repository,
    clock: _dependencies.clock,
    ids: _dependencies.ids,
    tracker: _dependencies.tracker,
    assessWorkItemRelation: _dependencies.assessWorkItemRelation,
    bindingSnapshotFor: _dependencies.bindingSnapshotFor,
    automaticDeliveryGroupingEnabledFor: _dependencies.automaticDeliveryGroupingEnabledFor,
    workflow: () => workflow.workflow(),
    isActive: (state: ExecutionState) => lifecycle.isActive(state),
  });
  const workspace: IExecutionWorkspaces = new ExecutionWorkspaceService({
    repository: _dependencies.repository,
    workspace: _dependencies.workspace,
    retainFailedWorkspaces: _dependencies.retainFailedWorkspaces,
    isActive: (state: ExecutionState) => lifecycle.isActive(state),
  });
  const starting: IExecutionStarts = new ExecutionStartService({
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    repository: _dependencies.repository,
    catalog: _dependencies.catalog,
    authorizeLocalExecution: _dependencies.authorizeLocalExecution,
    ids: _dependencies.ids,
    workspace: _dependencies.workspace,
    clock: _dependencies.clock,
    positionPolicyFor: _dependencies.positionPolicyFor,
    workflow: () => workflow.workflow(),
    activeDeliveryGroupForRoot: (workItemId: string) =>
      groups.activeDeliveryGroupForRoot(workItemId),
    assertStageAllowsRole: (item: IWorkItem, role: ProcessRole) =>
      workflow.assertStageAllowsRole(item, role),
    isActive: (state: ExecutionState) => lifecycle.isActive(state),
    executionScope: (workItem: IWorkItem, role: SkillFlowRole) =>
      goals.executionScope(workItem, role),
    admitWorkItemClaims: (
      items: readonly IWorkItem[],
      action: IWorkItemClaim['action'],
      executionId: string,
      inheritedClaims: readonly IWorkItemClaim[],
      deliveryGroup: IDeliveryGroup | undefined,
    ) => claims.admitWorkItemClaims(items, action, executionId, inheritedClaims, deliveryGroup),
    advanceOnClaim: (item: IWorkItem, role: ProcessRole, runId: string, claim?: IWorkItemClaim) =>
      workflow.advanceOnClaim(item, role, runId, claim),
    rollbackAcquiredClaims: (admissions: readonly GroupClaimAdmission[]) =>
      claims.rollbackAcquiredClaims(admissions),
    pauseDeliveryGroup: (
      group: IDeliveryGroup,
      pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
    ) => groups.pauseDeliveryGroup(group, pauseReason),
    groupedDeliveryRequest: (group: IDeliveryGroup, workItems: readonly IWorkItem[]) =>
      groups.groupedDeliveryRequest(group, workItems),
    reportRunStarted: (item: IWorkItem, role: ProcessRole, executionId: string) =>
      workflow.reportRunStarted(item, role, executionId),
    updateGoalExecution: (
      execution: IExecutionRecord,
      state: IGoalRecord['state'],
      role: SkillFlowRole,
    ) => goals.updateGoalExecution(execution, state, role),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
    launchExecution: (executionId: string, run: (signal: AbortSignal) => Promise<void>) =>
      lifecycle.launchExecution(executionId, run),
    completeInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) => run.completeInBackground(execution, item, simulateFailure, signal),
    assertNoActiveExecution: (item: IWorkItem) => admission.assertNoActiveExecution(item),
    assertNoCriticalPathCollision: (workItem: IWorkItem) =>
      groups.assertNoCriticalPathCollision(workItem),
    retainedImplementationWorkspace: (executions: readonly IExecutionRecord[]) =>
      workspace.retainedImplementationWorkspace(executions),
    goalForWorkItem: (workItemId: string) => goals.goalForWorkItem(workItemId),
    implementationContract: (execution: IExecutionRecord, analysis: string) =>
      goals.implementationContract(execution, analysis),
    completeSolutionInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      analysis: string,
      feedback: string | undefined,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) =>
      run.completeSolutionInBackground(
        execution,
        item,
        analysis,
        feedback,
        simulateFailure,
        signal,
      ),
    reserveExecutionCapacity: () => admission.reserveExecutionCapacity(),
    coordinatesWorkItem: (workItem: IWorkItem) => claims.coordinatesWorkItem(workItem),
    acquireWorkItemClaim: (
      item: IWorkItem,
      action: IWorkItemClaim['action'],
      executionId: string,
    ) => claims.acquireWorkItemClaim(item, action, executionId),
    completeAgenticDiagnosisInBackground: (
      execution: IExecutionRecord,
      item: IWorkItem,
      simulateFailure: boolean,
      signal: AbortSignal,
    ) => run.completeAgenticDiagnosisInBackground(execution, item, simulateFailure, signal),
    releaseExecutionCapacity: () => admission.releaseExecutionCapacity(),
  });
  const manual: IManualExecutions = new ManualExecutionService({
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    clock: _dependencies.clock,
    ids: _dependencies.ids,
    catalog: _dependencies.catalog,
    repository: _dependencies.repository,
    assertStageAllowsRole: (item: IWorkItem, role: ProcessRole) =>
      workflow.assertStageAllowsRole(item, role),
    assertNoActiveExecution: (item: IWorkItem) => admission.assertNoActiveExecution(item),
    executionScope: (workItem: IWorkItem, role: SkillFlowRole) =>
      goals.executionScope(workItem, role),
    reportRunResult: (
      item: IWorkItem,
      role: ProcessRole,
      execution: IExecutionRecord,
      outcome: RunOutcome,
      summary: string,
    ) => workflow.reportRunResult(item, role, execution, outcome, summary),
    goalForWorkItem: (workItemId: string) => goals.goalForWorkItem(workItemId),
    recordManualAnalysisGoal: (
      manualGoal: IGoalRecord,
      execution: IExecutionRecord,
      normalizedSummary: string,
      now: string,
    ) => goals.recordManualAnalysisGoal(manualGoal, execution, normalizedSummary, now),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
    publishNote: (item: IWorkItem, executionId: string | undefined, note: IWorkItemNote) =>
      publication.publishNote(item, executionId, note),
    recordManualSolutionGoal: (
      manualGoal: IGoalRecord,
      execution: IExecutionRecord,
      verificationReport: IGoalVerificationReport,
      now: string,
    ) => goals.recordManualSolutionGoal(manualGoal, execution, verificationReport, now),
    implementationNote: (execution: IExecutionRecord, summary: string) =>
      publication.implementationNote(execution, summary),
  });
  const run: IExecutionRuns = new ExecutionRunService({
    catalog: _dependencies.catalog,
    agent: _dependencies.agent,
    clock: _dependencies.clock,
    repository: _dependencies.repository,
    workspace: _dependencies.workspace,
    verifyImplementation: _dependencies.verifyImplementation,
    maximumVerificationRepairAttempts: _dependencies.maximumVerificationRepairAttempts,
    ids: _dependencies.ids,
    delivery: _dependencies.delivery,
    agenticDeliveryRecovery: _dependencies.agenticDeliveryRecovery,
    latestExecution: (executionId: string) => lifecycle.latestExecution(executionId),
    advanceClaimForResult: (
      claim: IWorkItemClaim,
      action: IWorkItemClaim['action'],
      executionId?: string,
    ) => claims.advanceClaimForResult(claim, action, executionId),
    reportRunResult: (
      item: IWorkItem,
      role: ProcessRole,
      execution: IExecutionRecord,
      outcome: RunOutcome,
      summary: string,
    ) => workflow.reportRunResult(item, role, execution, outcome, summary),
    goalForWorkItem: (workItemId: string) => goals.goalForWorkItem(workItemId),
    recordAnalysisGoal: (goal: IGoalRecord, completed: IExecutionRecord, summary: string) =>
      goals.recordAnalysisGoal(goal, completed, summary),
    finalizeWorkspace: (execution: IExecutionRecord) => workspace.finalizeWorkspace(execution),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
    publishNote: (item: IWorkItem, executionId: string | undefined, note: IWorkItemNote) =>
      publication.publishNote(item, executionId, note),
    finishAbortedExecution: (execution: IExecutionRecord) =>
      lifecycle.finishAbortedExecution(execution),
    waitForReactivation: (
      execution: IExecutionRecord,
      cause: AgentInterruptionError,
      signal: AbortSignal,
    ) => lifecycle.waitForReactivation(execution, cause, signal),
    finishFailedExecution: (execution: IExecutionRecord, cause: unknown, fallback: string) =>
      lifecycle.finishFailedExecution(execution, cause, fallback),
    effectiveImplementationContract: (
      execution: IExecutionRecord,
      goal: IGoalRecord | undefined,
      analysis: string,
    ) => goals.effectiveImplementationContract(execution, goal, analysis),
    recordVerifiedGoal: (
      goal: IGoalRecord,
      current: IExecutionRecord,
      contract: IImplementationContract,
      verificationReport: IGoalVerificationReport,
      failures: readonly string[],
      repairing: boolean,
    ) => goals.recordVerifiedGoal(goal, current, contract, verificationReport, failures, repairing),
    synchronizeDeliveryGroupPullRequest: (
      execution: IExecutionRecord,
      workItem: IWorkItem,
      pullRequest: IPullRequestReference,
    ) => groups.synchronizeDeliveryGroupPullRequest(execution, workItem, pullRequest),
    releaseWorkItemClaim: (claim: IWorkItemClaim) => claims.releaseWorkItemClaim(claim),
    implementationNote: (execution: IExecutionRecord, summary: string) =>
      publication.implementationNote(execution, summary),
    recordGoalHandoff: (
      goal: IGoalRecord,
      executionId: string,
      previousAgentId: string,
      nextAgentId: string,
      changeSet: { readonly changedFiles: readonly string[] },
      now: string,
    ) => goals.recordGoalHandoff(goal, executionId, previousAgentId, nextAgentId, changeSet, now),
  });
  const claims: IExecutionClaims = new ExecutionClaimService({
    coordination: _dependencies.coordination,
    repository: _dependencies.repository,
    clock: _dependencies.clock,
    isActive: (state: ExecutionState) => lifecycle.isActive(state),
    latestExecution: (executionId: string) => lifecycle.latestExecution(executionId),
    finishFailedExecution: (execution: IExecutionRecord, cause: unknown, fallback: string) =>
      lifecycle.finishFailedExecution(execution, cause, fallback),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
    pauseDeliveryGroup: (
      group: IDeliveryGroup,
      pauseReason: NonNullable<IDeliveryGroup['pauseReason']>,
    ) => groups.pauseDeliveryGroup(group, pauseReason),
  });
  const publication: IExecutionPublication = new ExecutionPublicationService({
    delivery: _dependencies.delivery,
    repository: _dependencies.repository,
    workspace: _dependencies.workspace,
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    tracker: _dependencies.tracker,
    synchronizeDeliveryGroupPullRequest: (
      execution: IExecutionRecord,
      workItem: IWorkItem,
      pullRequest: IPullRequestReference,
    ) => groups.synchronizeDeliveryGroupPullRequest(execution, workItem, pullRequest),
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
  });
  const workflow: IExecutionWorkflow = new ExecutionWorkflowService({
    skillTextDigest: _dependencies.skillTextDigest,
    workflowReporter: _dependencies.workflowReporter,
    clock: _dependencies.clock,
    catalog: _dependencies.catalog,
    remoteProjectionQueries: _dependencies.remoteProjectionQueries,
    tracker: _dependencies.tracker,
    record: (
      executionId: string,
      kind: IExecutionEvent['kind'],
      message: string,
      stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
    ) => events.record(executionId, kind, message, stream),
  });
  const events: IExecutionEvents = new ExecutionEventService({
    ids: _dependencies.ids,
    clock: _dependencies.clock,
    repository: _dependencies.repository,
    publish: _dependencies.publish,
  });
  return {
    lifecycle,
    admission,
    goals,
    groups,
    workspace,
    starting,
    manual,
    run,
    claims,
    publication,
    workflow,
    events,
  };
}
