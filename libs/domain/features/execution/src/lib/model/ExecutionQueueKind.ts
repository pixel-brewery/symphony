// #region Imports

import { executionQueueKinds } from './ExecutionQueueKinds';

// #endregion

export type ExecutionQueueKind = (typeof executionQueueKinds)[number];
