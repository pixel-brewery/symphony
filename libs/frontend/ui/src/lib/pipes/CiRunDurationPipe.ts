// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';

// #endregion

@Pipe({ name: 'ciRunDuration', standalone: true, pure: true })
export class CiRunDurationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param run - Run.
   * @public
   */
  public transform(run: Pick<ICiRun, 'startedAt' | 'finishedAt'>): string | undefined {
    if (!run.startedAt || !run.finishedAt) return undefined;
    const seconds = Math.max(
      0,
      Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1_000),
    );
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  // #endregion
}
