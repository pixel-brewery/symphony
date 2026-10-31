// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

@Pipe({ name: 'menuExecutionResumeHint', standalone: true, pure: true })
export class MenuExecutionResumeHintPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @param availableSlots - Available slots.
   * @public
   */
  public transform(execution: IExecutionRecord, availableSlots: number): string {
    if (execution.pause?.resumeRequestedAt) return 'Waiting for the next available execution slot';
    // A lifecycle pause never gave up its slot, so it resumes without competing for one.
    if (execution.pause?.reason === 'lifecycle') return 'Resume execution';
    if (availableSlots === 0) return 'Resume when a slot becomes available';
    return 'Resume execution';
  }

  // #endregion
}
