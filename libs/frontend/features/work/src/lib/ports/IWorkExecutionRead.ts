// #region Imports

import type { IExecutionOperations } from '@symphony/frontend-core/execution';

// #endregion

/** The actual optional participant consumed by Work, without another state owner. @public */
export type IWorkExecutionRead = Pick<IExecutionOperations, 'executionQueue'>;
