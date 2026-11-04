// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'menuExecutionResumeHint', standalone: true, pure: false })
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
    if (execution.pause?.resumeRequestedAt)
      return translateLabel(
        'loc.symphony.labels.waiting.for.the.next.available.execution.slot.f4997f9',
      );
    // A lifecycle pause never gave up its slot, so it resumes without competing for one.
    if (execution.pause?.reason === 'lifecycle')
      return translateLabel('loc.symphony.labels.resume.execution.f712942');
    if (availableSlots === 0)
      return translateLabel('loc.symphony.labels.resume.when.a.slot.becomes.available.7c333f1');
    return translateLabel('loc.symphony.labels.resume.execution.f712942');
  }

  // #endregion
}
