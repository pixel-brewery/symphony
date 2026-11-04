// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ITaskRuntimeState } from './ITaskRuntimeState';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface ITaskRuntimePresentation {
  readonly label: string;
  readonly message?: string;
  readonly variant: 'primary' | 'neutral' | 'info' | 'success' | 'danger';
  readonly isRunning: boolean;
}

@Pipe({ name: 'taskRuntimePresentation', standalone: true, pure: false })
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
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solve.queued.f981821')
              : translateLabel('loc.symphony.labels.analysis.queued.8e9e691');
          },
          message,
          variant: 'neutral',
          isRunning: false,
        };
      case 'running':
        return {
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solving.3989676')
              : translateLabel('loc.symphony.labels.analyzing.0141ee9');
          },
          message,
          variant: 'info',
          isRunning: true,
        };
      case 'waiting':
        return {
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solve.waiting.to.resume.4635feb')
              : translateLabel('loc.symphony.labels.analysis.waiting.to.resume.d9450bd');
          },
          message,
          variant: 'neutral',
          isRunning: true,
        };
      case 'succeeded':
        return {
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solved.eb858c4')
              : translateLabel('loc.symphony.labels.analyzed.bca82ad');
          },
          message,
          variant: 'success',
          isRunning: false,
        };
      case 'failed':
        return {
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solve.failed.5165ea7')
              : translateLabel('loc.symphony.labels.analysis.failed.4d6ac1b');
          },
          message,
          variant: 'danger',
          isRunning: false,
        };
      case 'cancelled':
        return {
          get label() {
            return solution
              ? translateLabel('loc.symphony.labels.solve.cancelled.b62a224')
              : translateLabel('loc.symphony.labels.analysis.cancelled.d5fe019');
          },
          message,
          variant: 'primary',
          isRunning: false,
        };
    }
  }

  private compactMessage(message: string | undefined): string | undefined {
    if (!message) return undefined;
    if (message.startsWith('Workspace prepared at '))
      return translateLabel('loc.symphony.labels.workspace.prepared.decac8a');
    if (message.startsWith('Inspected repository evidence in '))
      return translateLabel('loc.symphony.labels.inspecting.repository.evidence.676c242');
    const firstMarkdownLine = message
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find(Boolean);
    if (firstMarkdownLine && firstMarkdownLine !== message.trim()) return firstMarkdownLine;
    return message.length > 96 ? `${message.slice(0, 93)}…` : message;
  }

  // #endregion
}
