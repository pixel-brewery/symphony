// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface ITaskActionPresentation {
  readonly analysisIcon: 'play' | 'sync';
  readonly analysisLabel: string;
  readonly solutionLabel: string;
}

@Pipe({ name: 'taskActionPresentation', standalone: true, pure: false })
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
      ? translateLabel('loc.symphony.labels.analyzing.task.66b595c')
      : analysis?.state === 'succeeded'
        ? translateLabel('loc.symphony.labels.re.analyze.6e0f353')
        : analysis?.state === 'failed'
          ? translateLabel('loc.symphony.labels.retry.analysis.bf5f0cb')
          : analysis?.state === 'cancelled'
            ? translateLabel('loc.symphony.labels.restart.analysis.b30cd30')
            : translateLabel('loc.symphony.labels.analyze.task.df5bf4d');
    return {
      analysisIcon: analysis?.state === 'succeeded' ? 'sync' : 'play',
      analysisLabel,
      solutionLabel: requiresFeedback
        ? translateLabel('loc.symphony.labels.apply.feedback.4515443')
        : translateLabel('loc.symphony.labels.implement.fix.bcc6555'),
    };
  }

  // #endregion
}
