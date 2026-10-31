// #region Imports

import type { ICiRunJob } from '@symphony/domain-ci';
import type { IActionLogStepView } from './IActionLogStepView';

// #endregion

export interface IActionLogJobView extends Omit<ICiRunJob, 'steps'> {
  readonly steps: readonly IActionLogStepView[];
}
