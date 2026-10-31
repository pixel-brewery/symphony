// #region Imports

import type { ReportingPeriod } from './ReportingPeriod';

// #endregion

/**
 * Length of a reporting period in days: 7, 30, or 90 for a quarter.
 *
 * @param period - The reporting period.
 * @returns Its length in days.
 * @public
 */
export function reportingPeriodDays(period: ReportingPeriod): number {
  switch (period) {
    case '7-days':
      return 7;
    case '30-days':
      return 30;
    case 'quarter':
      return 90;
  }
}
