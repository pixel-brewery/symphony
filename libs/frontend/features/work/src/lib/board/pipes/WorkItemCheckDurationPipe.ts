// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IWorkItemCheck } from '../view-presenters/workItemDetail';

// #endregion

const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;

/**
 * Formats how long a check ran - or, while it runs, has been running - as `42 s`, `5 min` or
 * `1 h 12 min`; `—` when its run reports no start.
 *
 * @public
 */
@Pipe({ name: 'workItemCheckDuration', standalone: true, pure: true })
export class WorkItemCheckDurationPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the duration text.
   *
   * @param check - The check.
   * @param now - Current time in milliseconds, for a check that still runs.
   * @returns The duration.
   * @public
   */
  public transform(
    check: Pick<IWorkItemCheck, 'startedAt' | 'finishedAt' | 'status'>,
    now: number,
  ): string {
    const started = check.startedAt ? Date.parse(check.startedAt) : Number.NaN;
    if (!Number.isFinite(started)) return '—';
    const running = check.status === 'queued' || check.status === 'in-progress';
    const ended = check.finishedAt ? Date.parse(check.finishedAt) : running ? now : Number.NaN;
    if (!Number.isFinite(ended)) return '—';
    const seconds = Math.max(0, Math.round((ended - started) / 1_000));
    if (seconds < MINUTE_SECONDS) return `${seconds} s`;
    if (seconds < HOUR_SECONDS) return `${Math.round(seconds / MINUTE_SECONDS)} min`;
    const hours = Math.floor(seconds / HOUR_SECONDS);
    const minutes = Math.round((seconds % HOUR_SECONDS) / MINUTE_SECONDS);
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  // #endregion
}
