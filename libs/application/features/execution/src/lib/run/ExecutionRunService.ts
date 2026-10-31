// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IAgenticDeliveryRecord } from '@symphony/domain-automation';
import type { ISkillManifest, ISkillPackageDocument, SkillFlowRole } from '@symphony/domain-skills';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import { AgentInterruptionError } from '@symphony/application-ai';
import type { IAgentProgress } from '../ports/IAgentProgress';
import { composeExecutionContext } from '../context/composeExecutionContext';
import { isDocumentPointerAnalysis } from './isDocumentPointerAnalysis';
import { serializeImplementationContract } from './serializeImplementationContract';
import { assertContractAcceptsChanges } from './assertContractAcceptsChanges';
import { validateImplementationScope } from './validateImplementationScope';
import { verificationRepairRequest } from './verificationRepairRequest';
import type { IExecutionRuns } from './IExecutionRuns';
import type { IExecutionRunsDependencies } from './IExecutionRunsDependencies';

// #endregion

/** Executes agent steps, verifies results and reports terminal outcomes. @public */
export class ExecutionRunService implements IExecutionRuns {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionRunsDependencies) {}

  // #endregion

  // #region Methods

  /** Runs the analysis and durably reports its outcome. @public */
  public async completeInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void> {
    let current = execution;
    while (!signal.aborted) {
      try {
        const skillPackage = this.skillPackageForExecution(current, item.workspaceId, 'analysis');
        const skill = this.skillManifestForExecution(current, skillPackage, item.workspaceId);
        if (!current.workspacePath) throw new Error('Analyzer workspace is unavailable.');
        const context = composeExecutionContext(
          item,
          this._dependencies.catalog.workflow(),
          skill,
          current.workspacePath,
          current.workspaceReference,
          current.continuationReference,
          current.bindingSnapshot,
        );
        const summary = await this._dependencies.agent.analyze(
          context,
          skillPackage,
          current.request,
          (progress) => this.recordAgentProgress(current.id, 'agent.progress', progress),
          simulateFailure,
          signal,
        );
        if (this.isSemanticFailure(summary)) throw new Error(summary);
        if (isDocumentPointerAnalysis(summary))
          throw new Error(
            'The analysis referenced a document instead of reporting the plan. Symphony stores the analysis text itself and discards the workspace afterwards, so the complete plan must be returned inline.',
          );
        const latest = this._dependencies.latestExecution(current.id);
        const currentClaims =
          latest.workItemClaims ?? (latest.workItemClaim ? [latest.workItemClaim] : []);
        const advancedClaims: IWorkItemClaim[] = [];
        for (const claim of currentClaims) {
          advancedClaims.push(
            await this._dependencies.advanceClaimForResult(claim, 'solve', latest.id),
          );
        }
        const advancedClaim = advancedClaims.find(
          (claim) => claim.workItemId === latest.workItemId,
        );
        const completed: IExecutionRecord = {
          ...latest,
          ...(advancedClaim ? { workItemClaim: advancedClaim } : {}),
          ...(advancedClaims.length ? { workItemClaims: advancedClaims } : {}),
          state: 'succeeded',
          summary,
          finishedAt: this._dependencies.clock.now(),
          lastHeartbeatAt: this._dependencies.clock.now(),
        };
        this._dependencies.repository.saveExecution(completed);
        await this._dependencies.reportRunResult(item, 'analyze', completed, 'pass', summary);
        const goal = this._dependencies.goalForWorkItem(item.id);
        if (goal) {
          this._dependencies.recordAnalysisGoal(goal, completed, summary);
        }
        await this._dependencies.finalizeWorkspace(completed);
        await this._dependencies.record(current.id, 'analysis.completed', summary);
        await this._dependencies.publishNote(item, completed.id, {
          kind: 'analysis',
          heading: 'Symphony analysis',
          body: summary,
        });
        return;
      } catch (cause) {
        if (signal.aborted) {
          await this._dependencies.finishAbortedExecution(current);
          return;
        }
        if (cause instanceof AgentInterruptionError) {
          const reactivated = await this._dependencies.waitForReactivation(current, cause, signal);
          if (!reactivated) {
            await this._dependencies.finishAbortedExecution(current);
            return;
          }
          current = reactivated;
          continue;
        }
        await this._dependencies.finishFailedExecution(current, cause, 'Unknown Analyzer failure');
        return;
      }
    }
    await this._dependencies.finishAbortedExecution(current);
  }

  /** Runs implementation, bounded verification and configured repair rounds. @public */
  public async completeSolutionInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    analysis: string,
    feedback: string | undefined,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void> {
    let current = execution;
    // A repair round replaces the request rather than the run, so the agent keeps the worktree it
    // already changed and is told only what the deterministic checks rejected.
    let request = feedback;
    while (!signal.aborted) {
      try {
        const skillPackage = this.skillPackageForExecution(current, item.workspaceId, 'solution');
        const skill = this.skillManifestForExecution(current, skillPackage, item.workspaceId);
        if (!current.workspacePath) throw new Error('Solver workspace is unavailable.');
        const context = composeExecutionContext(
          item,
          this._dependencies.catalog.workflow(),
          skill,
          current.workspacePath,
          current.workspaceReference,
          current.continuationReference,
          current.bindingSnapshot,
        );
        const goal = this._dependencies.goalForWorkItem(item.id);
        const contract = this._dependencies.effectiveImplementationContract(
          current,
          goal,
          analysis,
        );
        assertContractAcceptsChanges(contract);
        const summary = await this._dependencies.agent.solve(
          context,
          skillPackage,
          serializeImplementationContract(contract),
          request,
          (progress) => this.recordAgentProgress(current.id, 'solver.progress', progress),
          simulateFailure,
          signal,
        );
        const changeSet = current.workspacePath
          ? await this._dependencies.workspace.inspectChanges(current.workspacePath)
          : { changedFiles: [], diffLines: 0 };
        const scopeFailures = validateImplementationScope(contract, changeSet);
        const deterministicChecks = this._dependencies.verifyImplementation
          ? await this._dependencies.verifyImplementation(current.workspacePath, item, signal)
          : [];
        const verificationFailures = deterministicChecks
          .filter((check) => check.state === 'failed')
          .map((check) => check.detail ?? `${check.label} failed.`);
        const failures = [...scopeFailures, ...verificationFailures];
        // A scope failure is a refusal, not a defect: the run reached for paths its position
        // forbids, and handing it the same contract again only repeats the reach. Red checks are
        // the opposite - the change exists and is in scope, and only its result is wrong.
        const spentRepairs = current.verificationAttempt ?? 0;
        const repairBudget = Math.max(
          0,
          Math.floor(this._dependencies.maximumVerificationRepairAttempts?.() ?? 0),
        );
        const repairing =
          scopeFailures.length === 0 &&
          verificationFailures.length > 0 &&
          spentRepairs < repairBudget;
        const verificationReport = {
          id: this._dependencies.ids.next('verification'),
          executionId: current.id,
          recordedAt: this._dependencies.clock.now(),
          state: failures.length ? ('failed' as const) : ('passed' as const),
          changedFiles: changeSet.changedFiles,
          diffLines: changeSet.diffLines,
          checks: [
            {
              label: 'Implementation contract scope',
              state: scopeFailures.length ? ('failed' as const) : ('passed' as const),
            },
            ...deterministicChecks.map(({ label, state }) => ({ label, state })),
          ],
          ...(failures.length ? { message: failures.join(' ') } : {}),
        };
        if (goal) {
          this._dependencies.recordVerifiedGoal(
            goal,
            current,
            contract,
            verificationReport,
            failures,
            repairing,
          );
        }
        if (repairing) {
          current = {
            ...this._dependencies.latestExecution(current.id),
            verificationAttempt: spentRepairs + 1,
            lastHeartbeatAt: this._dependencies.clock.now(),
          };
          this._dependencies.repository.saveExecution(current);
          await this._dependencies.record(
            current.id,
            'execution.warning',
            `Repository verification failed; repair round ${spentRepairs + 1} of ${repairBudget} started.\n\n${verificationFailures.join('\n\n')}`,
          );
          request = verificationRepairRequest(deterministicChecks, feedback);
          continue;
        }
        if (failures.length) throw new Error(failures.join(' '));
        let completed: IExecutionRecord = {
          ...this._dependencies.latestExecution(current.id),
          state: 'succeeded',
          summary,
          finishedAt: this._dependencies.clock.now(),
          lastHeartbeatAt: this._dependencies.clock.now(),
        };
        if (completed.automationOrigin || completed.automationSignalId) {
          const delivery = this._dependencies.delivery;
          if (!delivery) {
            throw new Error('Remote implementation delivery is not available.');
          }
          this.updateAgenticDelivery(completed.agenticDeliveryId, {
            state: 'repairing',
            message:
              'Repair completed locally; commit, push, and pull-request reconciliation started.',
          });
          const pullRequest = await delivery.publishPullRequest(completed, item);
          completed = { ...completed, pullRequest };
          if (completed.deliveryGroupId) {
            await this._dependencies.synchronizeDeliveryGroupPullRequest(
              completed,
              item,
              pullRequest,
            );
          }
          this.updateAgenticDelivery(completed.agenticDeliveryId, {
            state: 'awaiting-ci',
            message: 'The managed pull-request branch was reconciled; waiting for CI.',
          });
        }
        const completedClaims =
          completed.workItemClaims ?? (completed.workItemClaim ? [completed.workItemClaim] : []);
        if (completedClaims.length) {
          const releasedClaims: IWorkItemClaim[] = [];
          for (const claim of completedClaims) {
            await this._dependencies.releaseWorkItemClaim(claim);
            releasedClaims.push({ ...claim, releasedAt: this._dependencies.clock.now() });
          }
          const releasedRootClaim = releasedClaims.find(
            (claim) => claim.workItemId === completed.workItemId,
          );
          completed = {
            ...completed,
            workItemClaims: releasedClaims,
            ...(releasedRootClaim ? { workItemClaim: releasedRootClaim } : {}),
          };
        }
        this._dependencies.repository.saveExecution(completed);
        await this._dependencies.reportRunResult(item, 'solve', completed, 'pass', summary);
        await this._dependencies.finalizeWorkspace(completed);
        await this._dependencies.record(current.id, 'solution.completed', summary);
        if (completed.pullRequest) {
          await this._dependencies.record(
            current.id,
            'pull-request.created',
            `Pull request #${completed.pullRequest.number} created or updated.`,
          );
        }
        await this._dependencies.publishNote(
          item,
          completed.id,
          this._dependencies.implementationNote(completed, summary),
        );
        return;
      } catch (cause) {
        if (signal.aborted) {
          await this._dependencies.finishAbortedExecution(current);
          return;
        }
        if (cause instanceof AgentInterruptionError) {
          const reactivated = await this._dependencies.waitForReactivation(current, cause, signal);
          if (!reactivated) {
            await this._dependencies.finishAbortedExecution(current);
            return;
          }
          current = reactivated;
          continue;
        }
        await this._dependencies.finishFailedExecution(current, cause, 'Unknown Solver failure');
        return;
      }
    }
    await this._dependencies.finishAbortedExecution(current);
  }

  /** Runs the read-only CI diagnosis and retains its result. @public */
  public async completeAgenticDiagnosisInBackground(
    execution: IExecutionRecord,
    item: IWorkItem,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<void> {
    let current = execution;
    while (!signal.aborted) {
      try {
        const skillPackage = this.skillPackageForExecution(
          current,
          item.workspaceId,
          'ci-diagnosis',
        );
        const skill = this.skillManifestForExecution(current, skillPackage, item.workspaceId);
        if (!current.workspacePath) throw new Error('CI diagnosis workspace is unavailable.');
        const context = composeExecutionContext(
          item,
          this._dependencies.catalog.workflow(),
          skill,
          current.workspacePath,
          current.workspaceReference,
          current.continuationReference,
          current.bindingSnapshot,
        );
        const summary = await this._dependencies.agent.analyze(
          context,
          skillPackage,
          current.request,
          (progress) => this.recordAgentProgress(current.id, 'agent.progress', progress),
          simulateFailure,
          signal,
        );
        if (this.isSemanticFailure(summary)) throw new Error(summary);
        let completed: IExecutionRecord = {
          ...this._dependencies.latestExecution(current.id),
          state: 'succeeded',
          summary,
          finishedAt: this._dependencies.clock.now(),
          lastHeartbeatAt: this._dependencies.clock.now(),
        };
        if (completed.workItemClaim) {
          await this._dependencies.releaseWorkItemClaim(completed.workItemClaim);
          completed = {
            ...completed,
            workItemClaim: {
              ...completed.workItemClaim,
              releasedAt: this._dependencies.clock.now(),
            },
          };
        }
        this._dependencies.repository.saveExecution(completed);
        await this._dependencies.finalizeWorkspace(completed);
        await this._dependencies.record(current.id, 'analysis.completed', summary);
        return;
      } catch (cause) {
        if (signal.aborted) {
          await this._dependencies.finishAbortedExecution(current);
          return;
        }
        if (cause instanceof AgentInterruptionError) {
          const reactivated = await this._dependencies.waitForReactivation(current, cause, signal);
          if (!reactivated) {
            await this._dependencies.finishAbortedExecution(current);
            return;
          }
          current = reactivated;
          continue;
        }
        await this._dependencies.finishFailedExecution(
          current,
          cause,
          'Unknown CI diagnosis failure',
        );
        return;
      }
    }
    await this._dependencies.finishAbortedExecution(current);
  }

  private async recordAgentProgress(
    executionId: string,
    kind: 'agent.progress' | 'solver.progress',
    progress: IAgentProgress,
  ): Promise<void> {
    const now = this._dependencies.clock.now();
    const current = this._dependencies.latestExecution(executionId);
    const previousAgentId = current.bindingSnapshot?.agentProfileId;
    const nextAgentId = progress.executionBinding?.agentProfileId;
    this._dependencies.repository.saveExecution({
      ...current,
      ...(progress.executionBinding && current.bindingSnapshot
        ? { bindingSnapshot: { ...current.bindingSnapshot, ...progress.executionBinding } }
        : {}),
      ...(progress.resetContinuationReference
        ? { continuationReference: undefined }
        : progress.continuationReference
          ? { continuationReference: progress.continuationReference }
          : {}),
      lastHeartbeatAt: now,
      ...(progress.tokenUsage ? { tokenUsage: progress.tokenUsage } : {}),
    });
    if (previousAgentId && nextAgentId && previousAgentId !== nextAgentId) {
      const goal = this._dependencies.goalForWorkItem(current.workItemId);
      if (goal) {
        const changeSet = current.workspacePath
          ? await this._dependencies.workspace
              .inspectChanges(current.workspacePath)
              .catch(() => ({ changedFiles: [] as readonly string[], diffLines: 0 }))
          : { changedFiles: [] as readonly string[], diffLines: 0 };
        this._dependencies.recordGoalHandoff(
          goal,
          executionId,
          previousAgentId,
          nextAgentId,
          changeSet,
          now,
        );
      }
    }
    if (!progress.message.trim()) return;
    await this._dependencies.record(executionId, kind, progress.message, {
      origin: 'agent',
      category: progress.category ?? 'status',
      ...(progress.actor ? { actor: progress.actor } : {}),
    });
  }

  private skillPackageForExecution(
    execution: IExecutionRecord,
    workspaceId: string | undefined,
    fallbackRole: SkillFlowRole,
  ): ISkillPackageDocument {
    const role = execution.skillFlowRole ?? fallbackRole;
    const active = this._dependencies.catalog.skill(role, workspaceId);
    if (active && active.id === execution.skillId) return active;
    const snapshot = execution.skillSnapshot;
    if (!snapshot || snapshot.id !== execution.skillId) {
      throw new Error(`Resolved ${role} skill is unavailable: ${execution.skillId ?? 'unknown'}`);
    }
    return {
      id: snapshot.id,
      name: snapshot.name,
      displayName: snapshot.displayName,
      description: snapshot.description,
      source: 'user',
      location: 'execution-snapshot',
      editable: false,
      implicitInvocation: false,
      updatedAt: execution.startedAt,
      digest: snapshot.digest,
      resourceCount: 0,
      warnings: [],
      instructions: snapshot.instructions,
      openaiYaml: '',
      files: [],
    };
  }

  private skillManifestForExecution(
    execution: IExecutionRecord,
    skill: ISkillPackageDocument,
    workspaceId: string | undefined,
  ): ISkillManifest {
    const configured = this._dependencies.catalog
      .skills(workspaceId)
      .find((candidate) => candidate.id === execution.skillId);
    if (configured) {
      return execution.skillFlowRole
        ? { ...configured, capabilities: [execution.skillFlowRole] }
        : configured;
    }
    return {
      id: skill.id,
      name: skill.name,
      version: skill.digest.slice(0, 12),
      description: skill.description,
      capabilities: [execution.skillFlowRole ?? 'general'],
      source:
        skill.source === 'bundled'
          ? 'bundled'
          : skill.source === 'repository'
            ? 'workspace'
            : 'user',
    };
  }

  private updateAgenticDelivery(
    deliveryId: string | undefined,
    update: Pick<IAgenticDeliveryRecord, 'state' | 'message'>,
  ): void {
    if (!deliveryId) return;
    const delivery = this._dependencies.agenticDeliveryRecovery
      .listAgenticDeliveries()
      .find((candidate) => candidate.id === deliveryId);
    if (!delivery) return;
    this._dependencies.agenticDeliveryRecovery.saveAgenticDelivery({
      ...delivery,
      ...update,
      updatedAt: this._dependencies.clock.now(),
    });
  }

  /** Recognizes a reported task failure requiring rework. @public */
  public isSemanticFailure(summary: string | undefined): boolean {
    return Boolean(
      summary && /^analysis (?:could not start|was not performed|did not run)\b/i.test(summary),
    );
  }

  // #endregion
}
