// #region Imports

import { describe, expect, it } from 'vitest';
import { reportingHistorySince } from './reportingHistorySince';

// #endregion

describe('reportingHistorySince', () => {
  it('reaches back to the earlier of the previous period and the first chart week', () => {
    // arrange
    const now = new Date(2026, 9, 30, 12, 0, 0).getTime();

    // act
    const week = new Date(reportingHistorySince('7-days', now));
    const month = Date.parse(reportingHistorySince('30-days', now));
    const quarter = Date.parse(reportingHistorySince('quarter', now));

    // assert
    expect([week.getFullYear(), week.getMonth(), week.getDate(), week.getDay()]).toEqual([
      2026, 8, 7, 1,
    ]);
    expect(week.getHours()).toBe(0);
    expect(month).toBe(new Date(2026, 9, 30, 12, 0, 0).getTime() - 60 * 86_400_000);
    expect(quarter).toBe(new Date(2026, 9, 30, 12, 0, 0).getTime() - 180 * 86_400_000);
  });
});
