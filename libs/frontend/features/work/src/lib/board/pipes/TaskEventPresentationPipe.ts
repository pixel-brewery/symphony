// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface ITaskEventPresentation {
  readonly icon: string;
  readonly label: string;
  readonly message: string;
  readonly variant: 'danger' | 'success' | 'warning' | 'highlight' | 'info';
}

@Pipe({ name: 'taskEventPresentation', standalone: true, pure: false })
export class TaskEventPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param event - Event.
   * @public
   */
  public transform(event: IExecutionEvent): ITaskEventPresentation {
    return {
      icon: this.icon(event),
      label: this.label(event),
      message: this.message(event),
      variant: this.variant(event),
    };
  }

  private label(event: IExecutionEvent): string {
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
    if (event.kind === 'execution.warning')
      return translateLabel('loc.symphony.labels.warning.e981dda');
    if (event.kind === 'execution.cancelled')
      return translateLabel('loc.symphony.labels.cancelled.d353a99');
    if (event.category === 'message') return 'Codex';
    if (event.category === 'reasoning')
      return translateLabel('loc.symphony.labels.reasoning.summary.04b4056');
    if (event.category === 'command') return translateLabel('loc.symphony.labels.command.7131669');
    if (event.category === 'file-change')
      return translateLabel('loc.symphony.labels.file.change.727dd4c');
    if (event.category === 'tool') return translateLabel('loc.symphony.labels.tool.2e53bdc');
    return translateLabel('loc.symphony.labels.run.update.3e94d41');
  }

  private icon(event: IExecutionEvent): string {
    if (event.kind === 'execution.started' || event.kind === 'solution.started') return 'play';
    if (event.kind === 'workspace.prepared') return 'folder';
    if (event.kind === 'solver.progress') return 'sparkle';
    if (event.kind === 'analysis.completed' || event.kind === 'solution.completed')
      return 'checkmark';
    if (event.kind === 'pull-request.created') return 'github';
    if (event.kind === 'execution.failed') return 'errorCircle';
    if (event.kind === 'execution.warning') return 'info';
    if (event.kind === 'execution.cancelled') return 'clear';
    if (event.category === 'message' || event.category === 'reasoning') return 'sparkle';
    if (event.category === 'file-change') return 'branch';
    if (event.category === 'tool') return 'flow';
    return 'executionOutline';
  }

  private variant(event: IExecutionEvent): ITaskEventPresentation['variant'] {
    if (event.kind === 'agent.progress' || event.kind === 'solver.progress') return 'info';
    if (event.kind === 'execution.failed') return 'danger';
    if (event.kind === 'execution.cancelled' || event.kind === 'execution.warning')
      return 'warning';
    if (
      event.kind === 'analysis.completed' ||
      event.kind === 'solution.completed' ||
      event.kind === 'pull-request.created'
    )
      return 'success';
    return event.origin === 'agent' ? 'highlight' : 'info';
  }

  private message(event: IExecutionEvent): string {
    if (event.kind === 'analysis.completed')
      return translateLabel('loc.symphony.labels.analysis.complete.60ffb9b');
    if (event.kind === 'solution.completed')
      return translateLabel('loc.symphony.labels.implementation.complete.aef5d51');
    if (event.kind === 'execution.failed')
      return translateLabel('loc.symphony.labels.execution.failed.19e5e64');
    if (event.kind === 'execution.cancelled')
      return translateLabel('loc.symphony.labels.execution.cancelled.f93991a');
    return event.message;
  }

  // #endregion
}
