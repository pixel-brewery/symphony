// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionEvent } from '@symphony/domain-execution';

// #endregion

interface ITaskEventPresentation {
  readonly icon: string;
  readonly label: string;
  readonly message: string;
  readonly variant: 'danger' | 'success' | 'warning' | 'highlight' | 'info';
}

@Pipe({ name: 'taskEventPresentation', standalone: true, pure: true })
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
    if (event.kind === 'execution.started') return 'Run started';
    if (event.kind === 'workspace.prepared') return 'Workspace prepared';
    if (event.kind === 'solution.started') return 'Implementation started';
    if (event.kind === 'pull-request.created') return 'Pull request';
    if (event.kind === 'analysis.completed' || event.kind === 'solution.completed') return 'Result';
    if (event.kind === 'execution.failed') return 'Failure';
    if (event.kind === 'execution.warning') return 'Warning';
    if (event.kind === 'execution.cancelled') return 'Cancelled';
    if (event.category === 'message') return 'Codex';
    if (event.category === 'reasoning') return 'Reasoning summary';
    if (event.category === 'command') return 'Command';
    if (event.category === 'file-change') return 'File change';
    if (event.category === 'tool') return 'Tool';
    return 'Run update';
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
    if (event.kind === 'analysis.completed') return 'Analysis complete';
    if (event.kind === 'solution.completed') return 'Implementation complete';
    if (event.kind === 'execution.failed') return 'Execution failed';
    if (event.kind === 'execution.cancelled') return 'Execution cancelled';
    return event.message;
  }

  // #endregion
}
