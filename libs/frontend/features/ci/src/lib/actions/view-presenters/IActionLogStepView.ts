// #region Imports

import type { ICiRunStep } from '@symphony/domain-ci';

// #endregion

export interface IActionLogStepView extends ICiRunStep {
  readonly protocol?: string;
}
