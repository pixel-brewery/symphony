// #region Imports

import type { IExecutionProjectionValue } from '@symphony/frontend-core/execution';

// #endregion

/** Applies Execution's bounded writes to the current transport projection. @public */
export interface IExecutionProjection {
  update(
    update: (value: IExecutionProjectionValue | undefined) => IExecutionProjectionValue | undefined,
  ): void;
}
