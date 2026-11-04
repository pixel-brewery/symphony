// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const DAY = 24 * 60 * 60 * 1_000;

/**
 * Formats when a run started for the run tables: `Today, 16:52`, `Yesterday`, `Oct 24`, and the
 * year for an earlier year.
 *
 * @public
 */
@Pipe({ name: 'actionRunStarted', standalone: true, pure: false })
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
      return translateLabel(
        'loc.symphony.labels.today.4ee9f32',
        date.toLocaleTimeString(labelLocale(), {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }),
      );
    }
    if (time >= startOfToday.getTime() - DAY)
      return translateLabel('loc.symphony.labels.yesterday.5661812');
    return date.toLocaleDateString(labelLocale(), {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() === startOfToday.getFullYear() ? {} : { year: 'numeric' }),
    });
  }

  // #endregion
}
