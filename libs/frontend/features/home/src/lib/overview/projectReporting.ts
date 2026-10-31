// #region Imports

import type { ICiRun, ICiRunHistory } from '@symphony/domain-ci';
import type { IWorkflowDefinition, IWorkflowStageChangeHistory } from '@symphony/domain-workflow';
import type { IDeliveryRecord } from './IDeliveryRecord';
import type { IReportingComparison } from './IReportingComparison';
import type { IReportingInput } from './IReportingInput';
import type { IReportingSummary } from './IReportingSummary';
import type { IWeeklyDeliveryCount } from './IWeeklyDeliveryCount';
import type { IWorkflowRunFigures } from './IWorkflowRunFigures';
import { projectDeliveryRecords } from './projectDeliveryRecords';
import { reportingPeriodDays } from './reportingPeriodDays';
import { startOfIsoWeek } from './startOfIsoWeek';

// #endregion

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Weeks the `Delivered per week` chart spans, the current week included. */
const CHART_WEEKS = 8;

/** One period: `(start, end]` in epoch milliseconds. */
interface IPeriodBounds {
  readonly start: number;
  readonly end: number;
}

/**
 * Computes the Overview's reporting figures for the selected period and the previous period of
 * the same length, from the workspace's own records only.
 *
 * - Agent runs come from the executions Symphony itself starts, so the history is complete; a
 *   run "needed no intervention" when it succeeded at its first attempt without being paused.
 * - Delivered, lead time and the weekly chart come from the recorded stage changes. A period
 *   that starts before the earliest recorded change has no value (and the previous period no
 *   comparison) rather than a misleading zero.
 * - Workflow success and runs come from the recorded run history merged with the current runs.
 *   A period that starts before the first recorded run has no value either.
 *
 * @param input - The period and the records the figures are computed from.
 * @returns The figures of the period.
 * @public
 */
export function projectReporting(input: IReportingInput): IReportingSummary {
  const length = reportingPeriodDays(input.period) * DAY_MILLISECONDS;
  const current: IPeriodBounds = { start: input.now - length, end: input.now };
  const previous: IPeriodBounds = { start: current.start - length, end: current.start };

  const agentExecutions = input.executions.filter((execution) => execution.mode !== 'manual');
  const currentRuns = agentExecutions.filter((execution) =>
    within(current, Date.parse(execution.startedAt)),
  );
  const agentRuns = {
    current: currentRuns.length,
    previous: agentExecutions.filter((execution) =>
      within(previous, Date.parse(execution.startedAt)),
    ).length,
    withoutIntervention: currentRuns.filter(
      (execution) =>
        execution.state === 'succeeded' && (execution.attempt ?? 1) <= 1 && !execution.pause,
    ).length,
  };

  return {
    ...(input.stageHistory && input.workflow
      ? deliveryFigures(input.stageHistory, input.workflow, current, previous)
      : {}),
    agentRuns,
    ...(input.runHistory ? runFigures(input.runHistory, input.ciRuns, current, previous) : {}),
  };
}

function within(period: IPeriodBounds, time: number): boolean {
  return time > period.start && time <= period.end;
}

/** Whether the record, complete from `recordedSince`, covers a period that starts at `start`. */
function covers(recordedSince: string | undefined, start: number): boolean {
  return recordedSince !== undefined && Date.parse(recordedSince) <= start;
}

function deliveryFigures(
  history: Pick<IWorkflowStageChangeHistory, 'changes' | 'recordedSince'>,
  workflow: Pick<IWorkflowDefinition, 'initialStageId' | 'stages'>,
  current: IPeriodBounds,
  previous: IPeriodBounds,
): Pick<
  IReportingSummary,
  'delivered' | 'medianLeadTimeDays' | 'deliveredPerWeek' | 'deliveryHistorySince'
> {
  const deliveries = projectDeliveryRecords(history.changes, workflow);
  const currentCovered = covers(history.recordedSince, current.start);
  const previousCovered = covers(history.recordedSince, previous.start);
  const inCurrent = deliveries.filter((record) => within(current, Date.parse(record.doneAt)));
  const inPrevious = deliveries.filter((record) => within(previous, Date.parse(record.doneAt)));
  const currentLead = medianLeadDays(inCurrent);
  const previousLead = previousCovered ? medianLeadDays(inPrevious) : undefined;
  const medianLeadTimeDays: IReportingComparison | undefined =
    currentCovered && currentLead !== undefined
      ? { current: currentLead, ...(previousLead === undefined ? {} : { previous: previousLead }) }
      : undefined;
  const weeks = weeklyCounts(deliveries, current.end, history.recordedSince);
  return {
    ...(history.recordedSince ? { deliveryHistorySince: history.recordedSince } : {}),
    ...(currentCovered
      ? {
          delivered: {
            current: inCurrent.length,
            ...(previousCovered ? { previous: inPrevious.length } : {}),
          },
        }
      : {}),
    ...(medianLeadTimeDays ? { medianLeadTimeDays } : {}),
    ...(weeks.some((week) => week.count !== undefined) ? { deliveredPerWeek: weeks } : {}),
  };
}

/** Median of the recorded Qualified → Done durations, in days with one decimal. */
function medianLeadDays(records: readonly IDeliveryRecord[]): number | undefined {
  const days = records
    .flatMap((record) =>
      record.qualifiedAt
        ? [(Date.parse(record.doneAt) - Date.parse(record.qualifiedAt)) / DAY_MILLISECONDS]
        : [],
    )
    .filter((value) => value >= 0)
    .toSorted((left, right) => left - right);
  if (!days.length) return undefined;
  const middle = Math.floor(days.length / 2);
  const median = days.length % 2 ? days[middle]! : (days[middle - 1]! + days[middle]!) / 2;
  return Math.round(median * 10) / 10;
}

/**
 * Deliveries per ISO week (Monday first, local time) for the eight weeks ending this week. A
 * week that starts before the recorded history has no count.
 */
function weeklyCounts(
  deliveries: readonly IDeliveryRecord[],
  now: number,
  recordedSince: string | undefined,
): readonly IWeeklyDeliveryCount[] {
  const thisMonday = startOfIsoWeek(now);
  const weeks: IWeeklyDeliveryCount[] = [];
  for (let offset = CHART_WEEKS - 1; offset >= 0; offset--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const count = deliveries.filter((record) => {
      const time = Date.parse(record.doneAt);
      return time >= start.getTime() && time < end.getTime();
    }).length;
    weeks.push({
      week: isoWeek(start),
      startsOn: localDate(start),
      ...(covers(recordedSince, start.getTime()) ? { count } : {}),
      current: offset === 0,
    });
  }
  return weeks;
}

function runFigures(
  history: Pick<ICiRunHistory, 'runs' | 'recordedSince'>,
  currentRuns: readonly ICiRun[],
  current: IPeriodBounds,
  previous: IPeriodBounds,
): Pick<IReportingSummary, 'workflowSuccess' | 'workflowRuns' | 'runHistorySince'> {
  const runs = new Map<string, ICiRun>();
  for (const run of [...history.runs, ...currentRuns]) {
    runs.set(`${run.id}#${run.runAttempt ?? 1}`, run);
  }
  const currentCovered = covers(history.recordedSince, current.start);
  const previousCovered = covers(history.recordedSince, previous.start);
  const inCurrent = [...runs.values()].filter((run) => within(current, runStart(run)));
  const inPrevious = [...runs.values()].filter((run) => within(previous, runStart(run)));
  const currentSuccess = successRate(inCurrent);
  const previousSuccess = previousCovered ? successRate(inPrevious) : undefined;
  return {
    ...(history.recordedSince ? { runHistorySince: history.recordedSince } : {}),
    ...(currentCovered && currentSuccess
      ? {
          workflowSuccess: {
            current: currentSuccess.rate,
            ...(previousSuccess ? { previous: previousSuccess.rate } : {}),
            succeeded: currentSuccess.succeeded,
            finished: currentSuccess.finished,
          },
        }
      : {}),
    ...(currentCovered ? { workflowRuns: outcomeFigures(inCurrent) } : {}),
  };
}

function runStart(run: ICiRun): number {
  return Date.parse(run.startedAt ?? run.finishedAt ?? '');
}

function successRate(
  runs: readonly ICiRun[],
): { rate: number; succeeded: number; finished: number } | undefined {
  const succeeded = runs.filter((run) => run.status === 'succeeded').length;
  const finished = succeeded + runs.filter((run) => run.status === 'failed').length;
  return finished
    ? { rate: Math.round((succeeded / finished) * 100), succeeded, finished }
    : undefined;
}

function outcomeFigures(runs: readonly ICiRun[]): IWorkflowRunFigures {
  const failures = new Map<string, number>();
  for (const run of runs) {
    if (run.status === 'failed') failures.set(run.name, (failures.get(run.name) ?? 0) + 1);
  }
  const top = [...failures].toSorted(
    ([leftName, left], [rightName, right]) => right - left || leftName.localeCompare(rightName),
  )[0];
  return {
    total: runs.length,
    succeeded: runs.filter((run) => run.status === 'succeeded').length,
    failed: runs.filter((run) => run.status === 'failed').length,
    cancelled: runs.filter((run) => run.status === 'cancelled').length,
    ...(top ? { topFailure: { workflowName: top[0], failures: top[1] } } : {}),
  };
}

function isoWeek(monday: Date): number {
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / DAY_MILLISECONDS -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7,
    )
  );
}

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
