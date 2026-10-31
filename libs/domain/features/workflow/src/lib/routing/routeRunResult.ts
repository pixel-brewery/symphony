// #region Imports

import type { HumanRequiredReasonCode } from '../workflow/HumanRequiredReasonCode';
import type { IRunResult } from '../workflow/IRunResult';
import type { IWorkflowDefinition } from '../workflow/IWorkflowDefinition';
import type { IWorkflowRecord } from '../workflow/IWorkflowRecord';
import type { IWorkflowTransition } from '../workflow/IWorkflowTransition';
import { isRetryReasonCode } from '../workflow/isRetryReasonCode';
import { madeNoProgress } from '../progress/madeNoProgress';
import { nextRetryAt } from '../retry/nextRetryAt';
import { retryBudgetRemaining } from '../retry/retryBudgetRemaining';
import type { IRoutingContext } from './IRoutingContext';
import type { RoutingDecision } from './RoutingDecision';
import { routeKey } from './routeKey';
import { transitionFor } from './transitionFor';
function reworkBudgetExceeded(
  workflow: IWorkflowDefinition,
  record: IWorkflowRecord,
  transition: IWorkflowTransition,
): boolean {
  const limits = workflow.policies.loopLimits;
  const perRoute = record.counters.reworksByRoute[routeKey(transition.from, transition.to)] ?? 0;
  const total = Object.values(record.counters.reworksByRoute).reduce(
    (sum, count) => sum + count,
    0,
  );
  return perRoute >= limits.maxReworkPerRoute || total >= limits.maxReworkTotal;
}

function exceededDuration(
  workflow: IWorkflowDefinition,
  record: IWorkflowRecord,
  now: Date,
): boolean {
  const enteredAt = new Date(record.counters.enteredAt).getTime();
  if (Number.isNaN(enteredAt)) return false;
  const limitMilliseconds = workflow.policies.loopLimits.maxDurationHours * 3_600_000;
  return now.getTime() - enteredAt > limitMilliseconds;
}

// #endregion

/**
 * Routes one finished run. Pure: identical inputs always produce the identical decision, so
 * routing is fully covered by table tests instead of live provider behavior.
 */
export function routeRunResult(
  workflow: IWorkflowDefinition,
  record: IWorkflowRecord,
  result: IRunResult,
  context: IRoutingContext,
): RoutingDecision {
  switch (result.outcome) {
    case 'pass': {
      const transition = transitionFor(
        workflow,
        record.stageId,
        (candidate) =>
          candidate.trigger.kind === 'outcome' &&
          candidate.trigger.role === result.role &&
          candidate.trigger.outcome === 'pass',
      );
      if (!transition) return { kind: 'hold', runtimeState: 'idle' };
      return {
        kind: 'transition',
        transition,
        invalidates: transition.invalidates ?? [],
      };
    }

    case 'retry': {
      const reasonCode = result.reasonCode;
      if (!reasonCode || !isRetryReasonCode(reasonCode)) {
        return { kind: 'escalate', reasonCode: 'guard-not-satisfiable' };
      }
      if (
        context.progressFingerprint !== undefined &&
        madeNoProgress(record.counters.lastProgressFingerprint, context.progressFingerprint) &&
        record.counters.consecutiveIdenticalFailures + 1 >=
          workflow.policies.loopLimits.maxIdenticalFailures
      ) {
        return { kind: 'escalate', reasonCode: 'loop-limit-reached' };
      }
      const attemptsForReason = record.counters.retriesByReason[reasonCode] ?? 0;
      if (
        !retryBudgetRemaining(workflow.policies.retry, attemptsForReason) ||
        exceededDuration(workflow, record, context.now)
      ) {
        return { kind: 'escalate', reasonCode: 'loop-limit-reached' };
      }
      const attempt = attemptsForReason + 1;
      return {
        kind: 'retry',
        attempt,
        retryAt: nextRetryAt(
          workflow.policies.retry,
          attempt,
          context.now,
          context.jitter,
        ).toISOString(),
        reasonCode,
      };
    }

    case 'rework': {
      const transition =
        (result.recommendedStageId !== undefined
          ? transitionFor(
              workflow,
              record.stageId,
              (candidate) =>
                candidate.to === result.recommendedStageId &&
                candidate.trigger.kind === 'outcome' &&
                candidate.trigger.role === result.role &&
                candidate.trigger.outcome === 'rework',
            )
          : undefined) ??
        transitionFor(
          workflow,
          record.stageId,
          (candidate) =>
            candidate.trigger.kind === 'outcome' &&
            candidate.trigger.role === result.role &&
            candidate.trigger.outcome === 'rework',
        );
      if (!transition) return { kind: 'escalate', reasonCode: 'guard-not-satisfiable' };
      if (
        reworkBudgetExceeded(workflow, record, transition) ||
        exceededDuration(workflow, record, context.now)
      ) {
        return { kind: 'escalate', reasonCode: 'loop-limit-reached' };
      }
      return {
        kind: 'transition',
        transition,
        invalidates: transition.invalidates ?? [],
      };
    }

    case 'blocked':
      return { kind: 'hold', runtimeState: 'blocked', reasonCode: result.reasonCode };

    case 'human-required':
      return {
        kind: 'escalate',
        reasonCode:
          (result.humanRequest?.reasonCode as HumanRequiredReasonCode | undefined) ??
          'decision-required',
      };

    case 'fatal':
      return {
        kind: 'quarantine',
        reasonCode: result.reasonCode ?? 'unknown-non-retryable-failure',
      };

    case 'cancelled':
      return { kind: 'close', closureReason: 'cancelled' };
  }
}
