// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';

// #endregion

interface ITaskActionPresentation {
  readonly analysisIcon: 'play' | 'sync';
  readonly analysisLabel: string;
  readonly solutionLabel: string;
}

@Pipe({ name: 'taskActionPresentation', standalone: true, pure: true })
export class TaskActionPresentationPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param analysis - Analysis.
   * @param isRunning - Is running.
   * @param requiresFeedback - Requires feedback.
   * @public
   */
  public transform(
    analysis: IExecutionRecord | undefined,
    isRunning: boolean,
    requiresFeedback: boolean,
  ): ITaskActionPresentation {
    const analysisLabel = isRunning
      ? 'Analyzing task'
      : analysis?.state === 'succeeded'
        ? 'Re-analyze'
        : analysis?.state === 'failed'
          ? 'Retry analysis'
          : analysis?.state === 'cancelled'
            ? 'Restart analysis'
            : 'Analyze task';
    return {
      analysisIcon: analysis?.state === 'succeeded' ? 'sync' : 'play',
      analysisLabel,
      solutionLabel: requiresFeedback ? 'Apply feedback' : 'Implement fix',
    };
  }

  // #endregion
}
