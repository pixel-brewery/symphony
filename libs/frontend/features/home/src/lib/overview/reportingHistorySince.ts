// #region Imports

import type { ReportingPeriod } from './ReportingPeriod';
import { reportingPeriodDays } from './reportingPeriodDays';
import { startOfIsoWeek } from './startOfIsoWeek';

// #endregion

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

/** Weeks the `Delivered per week` chart spans, the current week included. */
const CHART_WEEKS = 8;

/**
 * The earliest instant `Reporting` reads history from: the start of the previous period of the
 * selected length, or the Monday the eight-week chart starts on, whichever is earlier.
 *
 * @param period - The selected period.
 * @param now - Reference time in epoch milliseconds.
 * @returns The lower bound of the history reads (ISO instant).
 * @public
 */
export function reportingHistorySince(period: ReportingPeriod, now: number): string {
  const previousStart = now - 2 * reportingPeriodDays(period) * DAY_MILLISECONDS;
  const chartStart = startOfIsoWeek(now);
  chartStart.setDate(chartStart.getDate() - (CHART_WEEKS - 1) * 7);
  return new Date(Math.min(previousStart, chartStart.getTime())).toISOString();
}
