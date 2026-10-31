// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';

// #endregion

@Pipe({ name: 'executionEventIcon', standalone: true, pure: true })
export class ExecutionEventIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param event - Event.
   * @public
   */
  public transform(event: IExecutionEvent): string {
    if (event.kind === 'execution.failed') return 'errorCircle';
    if (
      event.kind === 'analysis.completed' ||
      event.kind === 'solution.completed' ||
      event.kind === 'pull-request.created'
    )
      return 'checkmark';
    if (event.category === 'message' || event.category === 'reasoning') return 'sparkle';
    if (event.category === 'file-change') return 'branch';
    if (event.category === 'tool') return 'flow';
    return 'executionOutline';
  }

  // #endregion
}
