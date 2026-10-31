// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

@Pipe({ name: 'menuExecutionTitle', standalone: true, pure: true })
export class MenuExecutionTitlePipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @public
   */
  public transform(execution: IExecutionRecord): string {
    return execution.workItemSnapshot?.title ?? execution.workItemId;
  }

  // #endregion
}
