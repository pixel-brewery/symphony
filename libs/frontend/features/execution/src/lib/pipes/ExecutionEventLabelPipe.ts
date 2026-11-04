// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'executionEventLabel', standalone: true, pure: false })
export class ExecutionEventLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param event - Event.
   * @public
   */
  public transform(event: IExecutionEvent): string {
    if (event.kind === 'execution.started')
      return translateLabel('loc.symphony.labels.run.started.0bb43be');
    if (event.kind === 'workspace.prepared')
      return translateLabel('loc.symphony.labels.workspace.prepared.60525ea');
    if (event.kind === 'solution.started')
      return translateLabel('loc.symphony.labels.implementation.started.b0ec109');
    if (event.kind === 'pull-request.created')
      return translateLabel('loc.symphony.labels.pull.request.f3dba66');
    if (event.kind === 'analysis.completed' || event.kind === 'solution.completed')
      return translateLabel('loc.symphony.labels.result.6e7d50e');
    if (event.kind === 'execution.failed')
      return translateLabel('loc.symphony.labels.failure.7031edb');
    if (event.kind === 'execution.cancelled')
      return translateLabel('loc.symphony.labels.cancelled.d353a99');
    switch (event.category) {
      case 'message':
        return translateLabel('loc.symphony.labels.message.2f77668');
      case 'reasoning':
        return translateLabel('loc.symphony.labels.reasoning.summary.04b4056');
      case 'command':
        return translateLabel('loc.symphony.labels.command.7131669');
      case 'file-change':
        return translateLabel('loc.symphony.labels.file.change.727dd4c');
      case 'tool':
        return translateLabel('loc.symphony.labels.tool.2e53bdc');
      default:
        return translateLabel('loc.symphony.labels.run.update.3e94d41');
    }
  }

  // #endregion
}
