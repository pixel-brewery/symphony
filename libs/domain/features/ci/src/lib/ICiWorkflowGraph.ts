// #region Imports

import type { ICiWorkflowJob } from './ICiWorkflowJob';

// #endregion

/** Definition loaded at the run's workflow revision; expressions remain explicit. */
export interface ICiWorkflowGraph {
  readonly revision: string;
  readonly path: string;
  readonly jobs: readonly ICiWorkflowJob[];
  readonly unresolved: readonly string[];
}
