// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IWorkflowStage, IWorkItemReadiness } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import type { IBoardPullRequestContext } from '../boardPullRequestAction';
import { BOARD_DELIVERY_STEP_COUNT } from './BoardDeliveryStepCount';
import type { IBoardCardState } from './IBoardCardState';

// #endregion

/** Zero-based delivery steps of the card's progress bar. */
const ANALYSIS = 0;
const SOLUTION = 1;
const IMPLEMENTATION = 2;
const CHECKS = 3;
const ACCEPTANCE = 4;

interface IBoardCardFacts {
  readonly item: IWorkItem;
  /** Workflow stages in process order. */
  readonly stages: readonly IWorkflowStage[];
  /** Every run of the item; the newest decides what is happening right now. */
  readonly executions: readonly IExecutionRecord[];
  readonly readiness?: IWorkItemReadiness;
  /** Whether the item is in the board's `Needs you` set. */
  readonly needsAttention: boolean;
  readonly pullRequest?: IBoardPullRequestContext;
  /** Ownership another orchestrator holds right now. */
  readonly coordination?: { readonly action: 'analyze' | 'solve'; readonly owner?: string };
  /** Label of the board column the item rests in. */
  readonly columnLabel: string;
  /** Display name of the agent profile that ran the newest execution. */
  readonly agentName?: string;
}

/**
 * Projects the facts the board already holds about one work item onto its card: the five-step
 * delivery progress, the step that waits on a person and what the status chip reports.
 *
 * Progress follows the workflow stage first - a stage that analyses has the analysis ahead of it,
 * a stage that verifies has analysis and solution behind it - and the stored analysis refines
 * it, so an analysed item still resting in an early stage shows its analysis as done. Stage
 * kinds and roles are read rather than stage ids, because stages are configuration.
 *
 * @param facts - Facts the board holds about the item.
 * @returns The card's state.
 * @public
 */
export function resolveBoardCardState(facts: IBoardCardFacts): IBoardCardState {
  const latest = newestExecution(facts.executions);
  const completedSteps = completedDeliverySteps(facts);
  const activeStep = Math.min(completedSteps, ACCEPTANCE);
  const avatar = facts.agentName
    ? { name: facts.agentName }
    : facts.item.assignees[0]
      ? {
          name: facts.item.assignees[0].displayName ?? facts.item.assignees[0].login,
          ...(facts.item.assignees[0].avatarUrl
            ? { imageUrl: facts.item.assignees[0].avatarUrl }
            : {}),
        }
      : undefined;
  const base = {
    completedSteps,
    activeStep,
    stageLabel: facts.columnLabel,
    ...(avatar ? { avatar } : {}),
  };

  if (facts.needsAttention) {
    const failed = latest?.state === 'failed';
    const step = latest?.state === 'failed' ? executionStep(latest, completedSteps) : activeStep;
    return {
      ...base,
      status: failed ? 'failed' : 'waiting-for-you',
      activeStep: step,
      blockedStep: step,
    };
  }
  if (facts.coordination) {
    return {
      ...base,
      status: 'elsewhere',
      coordinationAction: facts.coordination.action,
      ...(facts.coordination.owner ? { coordinationOwner: facts.coordination.owner } : {}),
    };
  }
  if (latest?.state === 'running' || latest?.state === 'waiting') {
    return { ...base, status: 'running', activeStep: executionStep(latest, completedSteps) };
  }
  const run = facts.pullRequest?.run;
  if (run?.status === 'in-progress') {
    return { ...base, status: 'running', activeStep: CHECKS };
  }
  if (latest?.state === 'queued') {
    return { ...base, status: 'queued', activeStep: executionStep(latest, completedSteps) };
  }
  if (run?.status === 'failed') {
    return { ...base, status: 'checks-failed', activeStep: CHECKS, blockedStep: CHECKS };
  }
  const baseBranch = facts.pullRequest?.summary?.baseBranchStatus;
  if (baseBranch === 'conflicting') return { ...base, status: 'conflicting' };
  if (baseBranch === 'behind') return { ...base, status: 'behind-base' };

  const stage = facts.stages.find((candidate) => candidate.id === facts.item.stageId);
  if (stage?.kind === 'terminal') return { ...base, status: 'done' };
  if (completedSteps === ACCEPTANCE && stage?.kind === 'human-gate') {
    return { ...base, status: 'ready-to-review' };
  }
  if (stage && isSolveStage(stage) && !stage.roles?.includes('verify')) {
    return { ...base, status: 'ready-for-agent' };
  }
  return { ...base, status: 'stage' };
}

/**
 * Number of completed delivery steps.
 *
 * @param facts - Card facts.
 * @returns A count from 0 to 5.
 */
function completedDeliverySteps(facts: IBoardCardFacts): number {
  const fromReadiness = facts.readiness?.readyForSolve
    ? IMPLEMENTATION
    : facts.readiness?.analysisStored
      ? SOLUTION
      : ANALYSIS;
  const stageIndex = facts.stages.findIndex((candidate) => candidate.id === facts.item.stageId);
  const stage = facts.stages[stageIndex];
  if (!stage) return fromReadiness;
  if (stage.kind === 'terminal') return BOARD_DELIVERY_STEP_COUNT;
  const verifiedBefore = facts.stages
    .slice(0, stageIndex)
    .some((candidate) => candidate.roles?.includes('verify'));
  if (verifiedBefore) return ACCEPTANCE;
  if (stage.roles?.includes('verify')) {
    const implemented =
      Boolean(facts.pullRequest) ||
      facts.executions.some(
        (execution) => isImplementation(execution) && execution.state === 'succeeded',
      );
    return implemented ? CHECKS : IMPLEMENTATION;
  }
  if (isSolveStage(stage)) return Math.max(IMPLEMENTATION, fromReadiness);
  return fromReadiness;
}

/**
 * Delivery step an execution works on: an analysis works out the analysis and then the solution,
 * an implementation run implements and then repairs what the checks found.
 *
 * @param execution - Running or queued execution.
 * @param completedSteps - Completed delivery steps.
 * @returns The zero-based step.
 */
function executionStep(execution: IExecutionRecord, completedSteps: number): number {
  if (!isImplementation(execution)) return Math.min(completedSteps, SOLUTION);
  return completedSteps >= CHECKS ? CHECKS : IMPLEMENTATION;
}

/**
 * Whether the execution implements the solution; legacy records without a kind are analyses.
 *
 * @param execution - Execution.
 * @returns True for solution and revision runs.
 */
function isImplementation(execution: IExecutionRecord): boolean {
  return execution.kind === 'solution' || execution.kind === 'revision';
}

/**
 * Whether the stage implements the solution.
 *
 * @param stage - Workflow stage.
 * @returns True when one of its roles solves.
 */
function isSolveStage(stage: IWorkflowStage): boolean {
  return Boolean(stage.roles?.includes('solve'));
}

/**
 * Newest execution by start time.
 *
 * @param executions - Runs of one item.
 * @returns The newest run, if any.
 */
function newestExecution(executions: readonly IExecutionRecord[]): IExecutionRecord | undefined {
  let latest: IExecutionRecord | undefined;
  for (const execution of executions) {
    if (!latest || latest.startedAt.localeCompare(execution.startedAt) < 0) latest = execution;
  }
  return latest;
}
