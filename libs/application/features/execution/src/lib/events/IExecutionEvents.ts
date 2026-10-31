// #region Imports

import type { IExecutionEvent } from '@symphony/domain-execution';

// #endregion

/** Commands exposed by the single events owner. @public */
export interface IExecutionEvents {
  record(
    executionId: string,
    kind: IExecutionEvent['kind'],
    message: string,
    stream?: Pick<IExecutionEvent, 'origin' | 'category' | 'actor'>,
  ): Promise<void>;
}
