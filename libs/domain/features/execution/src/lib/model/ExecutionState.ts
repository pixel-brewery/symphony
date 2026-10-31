// #region Imports

import { executionStates } from './ExecutionStates';

// #endregion

export type ExecutionState = (typeof executionStates)[number];
