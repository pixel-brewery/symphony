// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ITaskRuntimeState } from './ITaskRuntimeState';

// #endregion

interface ITaskRuntimePresentation {
  readonly label: string;
  readonly message?: string;
  readonly variant: 'primary' | 'neutral' | 'info' | 'success' | 'danger';
  readonly isRunning: boolean;
}

@Pipe({ name: 'taskRuntimePresentation', standalone: true, pure: true })
export class TaskRuntimePresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: ITaskRuntimeState | undefined): ITaskRuntimePresentation | undefined {
    if (!state) return undefined;
    const { execution, latestEvent } = state;
    const message = this.compactMessage(
      latestEvent?.message ?? execution.summary ?? execution.error,
    );
    const solution = execution.kind === 'solution' || execution.kind === 'revision';
    switch (execution.state) {
      case 'queued':
        return {
          label: solution ? 'Solve queued' : 'Analysis queued',
          message,
          variant: 'neutral',
          isRunning: false,
        };
      case 'running':
        return {
          label: solution ? 'Solving' : 'Analyzing',
          message,
          variant: 'info',
          isRunning: true,
        };
      case 'waiting':
        return {
          label: solution ? 'Solve waiting to resume' : 'Analysis waiting to resume',
          message,
          variant: 'neutral',
          isRunning: true,
        };
      case 'succeeded':
        return {
          label: solution ? 'Solved' : 'Analyzed',
          message,
          variant: 'success',
          isRunning: false,
        };
      case 'failed':
        return {
          label: solution ? 'Solve failed' : 'Analysis failed',
          message,
          variant: 'danger',
          isRunning: false,
        };
      case 'cancelled':
        return {
          label: solution ? 'Solve cancelled' : 'Analysis cancelled',
          message,
          variant: 'primary',
          isRunning: false,
        };
    }
  }

  private compactMessage(message: string | undefined): string | undefined {
    if (!message) return undefined;
    if (message.startsWith('Workspace prepared at ')) return 'Workspace prepared.';
    if (message.startsWith('Inspected repository evidence in '))
      return 'Inspecting repository evidence.';
    const firstMarkdownLine = message
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find(Boolean);
    if (firstMarkdownLine && firstMarkdownLine !== message.trim()) return firstMarkdownLine;
    return message.length > 96 ? `${message.slice(0, 93)}…` : message;
  }

  // #endregion
}
