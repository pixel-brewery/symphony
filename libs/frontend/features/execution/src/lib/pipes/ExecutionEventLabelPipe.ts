// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';

// #endregion

@Pipe({ name: 'executionEventLabel', standalone: true, pure: true })
export class ExecutionEventLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param event - Event.
   * @public
   */
  public transform(event: IExecutionEvent): string {
    if (event.kind === 'execution.started') return 'Run started';
    if (event.kind === 'workspace.prepared') return 'Workspace prepared';
    if (event.kind === 'solution.started') return 'Implementation started';
    if (event.kind === 'pull-request.created') return 'Pull request';
    if (event.kind === 'analysis.completed' || event.kind === 'solution.completed') return 'Result';
    if (event.kind === 'execution.failed') return 'Failure';
    if (event.kind === 'execution.cancelled') return 'Cancelled';
    switch (event.category) {
      case 'message':
        return 'Message';
      case 'reasoning':
        return 'Reasoning summary';
      case 'command':
        return 'Command';
      case 'file-change':
        return 'File change';
      case 'tool':
        return 'Tool';
      default:
        return 'Run update';
    }
  }

  // #endregion
}
