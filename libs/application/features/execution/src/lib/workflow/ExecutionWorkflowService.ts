// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type {
  IRunResult,
  IWorkflowDefinition,
  ProcessRole,
  RunOutcome,
} from '@symphony/domain-workflow';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import { findStage, stageExecutesRole } from '@symphony/domain-workflow';
import {
  analysisRevisionOf,
  operatorAnalysisArtifact,
  parseAnalysisArtifact,
} from '@symphony/domain-skills';
import { extractAcceptanceCriteria } from '../goals/extractAcceptanceCriteria';
import type { IExecutionWorkflow } from './IExecutionWorkflow';
import type { IExecutionWorkflowDependencies } from './IExecutionWorkflowDependencies';

// #endregion

/** Reports execution facts through the workflow supervisor. @public */
export class ExecutionWorkflowService implements IExecutionWorkflow {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionWorkflowDependencies) {}

  // #endregion

  // #region Methods

  /** Reports completed execution facts to guarded workflow transitions. @public */
  /**
   * Reports a finished run to the supervisor, which decides what it means for the stage.
   *
   * A provider or tool failure is a temporary technical fault and asks for a retry in the same
   * stage; a failure the agent itself reported as a semantic problem asks for rework, routed to
   * whichever step owns the cause.
   */
  public async reportRunResult(
    item: IWorkItem,
    role: ProcessRole,
    execution: IExecutionRecord,
    outcome: RunOutcome,
    summary: string,
  ): Promise<void> {
    const reporter = this._dependencies.workflowReporter;
    if (!reporter) return;
    try {
      const facts =
        role === 'analyze' && outcome === 'pass'
          ? await this.analysisRunFacts(item, execution, summary)
          : undefined;
      // A pass asserts that the stage's evidence now exists. An analysis without a Definition
      // of Ready asserts nothing the readiness guards can read, so passing it would leave the
      // work item looking analyzed while every guard into the next stage rejects it - the state
      // an operator cannot act on. Rework routes it back to the step that owns the gap.
      const reported: RunOutcome = facts && !facts.analysis ? 'rework' : outcome;
      await reporter.applyRunResult(item, {
        runId: execution.id,
        role,
        outcome: reported,
        ...(reported === 'retry' ? { reasonCode: 'transient-tool-error' as const } : {}),
        ...(reported === 'rework'
          ? {
              reasonCode:
                role === 'analyze'
                  ? ('analysis-incomplete' as const)
                  : ('implementation-defect' as const),
            }
          : {}),
        summary,
        evidence: [],
        ...(facts ?? {}),
        finishedAt: this._dependencies.clock.now(),
      });
    } catch (cause) {
      // Routing must never fail the run itself; the record is reconciled on the next pass.
      await this._dependencies.record(
        execution.id,
        'execution.warning',
        `The workflow could not route this result: ${
          cause instanceof Error ? cause.message : 'unknown routing error'
        }`,
      );
    }
  }

  /**
   * The Definition of Ready a passing analysis hands to the supervisor.
   *
   * An AI analysis must carry the machine-readable block its reporting contract demands; a
   * result without a valid block yields no artifact, and the caller reports that run as rework
   * rather than a pass, so the work item goes back for a complete analysis instead of resting
   * in a stage it cannot prove. A manual completion is the operator vouching for readiness, so
   * it is recorded as exactly that. The issue revision comes from the work-item snapshot
   * Symphony analyzed, never from the agent.
   */
  private async analysisRunFacts(
    item: IWorkItem,
    execution: IExecutionRecord,
    summary: string,
  ): Promise<Pick<IRunResult, 'analysis' | 'revisions'>> {
    const issueRevision = item.revision !== undefined ? String(item.revision) : '';
    const analysis =
      parseAnalysisArtifact(summary, issueRevision) ??
      (execution.mode === 'manual'
        ? operatorAnalysisArtifact(issueRevision, extractAcceptanceCriteria(summary))
        : undefined);
    if (!analysis) {
      // Not `execution.failed`: the run reached the end and produced a report, so a terminal
      // failure event would contradict the completion that follows it. The unusable report is
      // a workflow outcome, and the caller reports it as rework.
      await this._dependencies.record(
        execution.id,
        'execution.warning',
        'The analysis did not include a valid "Definition of ready" block, so it proves none of the readiness guards. The run is reported as rework and the work item is routed back for a complete analysis.',
      );
    }
    return {
      ...(analysis ? { analysis } : {}),
      revisions: {
        ...(issueRevision ? { issueRevision } : {}),
        // The revision addresses the analysis the record stores. Without an artifact nothing is
        // stored, and claiming a revision for it leaves the readiness guards contradicting each
        // other about which half of the evidence is missing.
        ...(analysis
          ? { analysisRevision: analysisRevisionOf(summary, this._dependencies.skillTextDigest) }
          : {}),
      },
    };
  }

  /** Reports the started role and run to the workflow supervisor. @public */
  public reportRunStarted(item: IWorkItem, role: ProcessRole, executionId: string): void {
    this._dependencies.workflowReporter?.runStarted(item, role, executionId);
  }

  /** Reads the workflow currently selected by the runtime catalog. @public */
  public workflow(): IWorkflowDefinition {
    return this._dependencies.catalog.workflow();
  }

  /** Rejects an execution role that the current stage cannot run. @public */
  /**
   * Rejects work whose stage does not run the requested role.
   *
   * A run may only start where the configured workflow says the role belongs. This is what
   * keeps a human gate closed: a gate stage runs no role, so no skill and no automated cycle
   * can start work there, and the item advances only through a recorded human decision.
   */
  public assertStageAllowsRole(item: IWorkItem, role: ProcessRole): void {
    if (!item.stageId) {
      throw new Error(
        `Work item ${item.externalId} sits in a board column that is not mapped to a workflow stage. Map the column in the board settings.`,
      );
    }
    if (stageExecutesRole(this.workflow().stages, item.stageId, role)) return;
    const stage = findStage(this.workflow().stages, item.stageId);
    throw new Error(
      stage?.kind === 'human-gate'
        ? `Work item ${item.externalId} waits for a decision in ${stage.label}. Decide it before starting ${role}.`
        : `Work item ${item.externalId} rests in ${stage?.label ?? item.stageId}, which does not run ${role}.`,
    );
  }

  /** Applies the guarded claim transition before execution starts. @public */
  /**
   * Applies the transition the workflow defines for claiming an item for this role, if it
   * defines one. Claiming is the only movement a run performs on its own; every other
   * transition needs an outcome or a human decision.
   */
  public async advanceOnClaim(
    item: IWorkItem,
    role: ProcessRole,
    runId: string,
    claim?: IWorkItemClaim,
  ): Promise<IWorkItem> {
    const reporter = this._dependencies.workflowReporter;
    if (reporter?.applyClaim) {
      // The supervisor owns the move: it mirrors the claim, evaluates the transition guards,
      // and throws when they refuse - which aborts this start before any work begins.
      const moved = await reporter.applyClaim(item, role, runId, claim);
      if (moved !== item) this._dependencies.remoteProjectionQueries.recordWorkItem(moved);
      return moved;
    }
    const transition = this.workflow().transitions.find(
      (candidate) =>
        candidate.from === item.stageId &&
        candidate.trigger.kind === 'claim' &&
        candidate.trigger.role === role,
    );
    if (!transition) return item;
    const moved = await this._dependencies.tracker.transition(item.id, transition.to);
    this._dependencies.remoteProjectionQueries.recordWorkItem(moved);
    return moved;
  }

  // #endregion
}
