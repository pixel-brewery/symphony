// #region Imports

import { executionKinds } from './ExecutionKinds';

// #endregion

export type ExecutionKind = (typeof executionKinds)[number];
