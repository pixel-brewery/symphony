// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';

// #endregion

type EventVariant = 'danger' | 'success' | 'warning' | 'highlight' | 'info' | 'primary';

@Pipe({ name: 'executionEventVariant', standalone: true, pure: true })
export class ExecutionEventVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param event - Event.
   * @public
   */
  public transform(event: IExecutionEvent): EventVariant {
    if (event.kind === 'agent.progress' || event.kind === 'solver.progress') return 'info';
    if (event.kind === 'execution.failed') return 'danger';
    if (event.kind === 'execution.warning') return 'warning';
    if (event.kind === 'execution.cancelled') return 'warning';
    if (
      event.kind === 'analysis.completed' ||
      event.kind === 'solution.completed' ||
      event.kind === 'pull-request.created'
    )
      return 'success';
    return event.origin === 'agent' ? 'highlight' : 'primary';
  }

  // #endregion
}
