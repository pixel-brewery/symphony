// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const DAY = 24 * 60 * 60 * 1_000;

/**
 * Formats when a run started for the run tables: `Today, 16:52`, `Yesterday`, `Oct 24`, and the
 * year for an earlier year.
 *
 * @public
 */
@Pipe({ name: 'actionRunStarted', standalone: true, pure: true })
export class ActionRunStartedPipe implements PipeTransform {
  // #region Methods

  /**
   * Formats the start time against the shared clock.
   *
   * @param value - ISO timestamp.
   * @param now - Reference time in epoch milliseconds.
   * @returns The label, or an empty string for a missing value.
   * @public
   */
  public transform(value: string | undefined, now: number): string {
    const time = value ? Date.parse(value) : Number.NaN;
    if (!Number.isFinite(time)) return '';
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const date = new Date(time);
    if (time >= startOfToday.getTime()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
    }
    if (time >= startOfToday.getTime() - DAY) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === startOfToday.getFullYear() ? {} : { year: 'numeric' }),
    });
  }

  // #endregion
}
