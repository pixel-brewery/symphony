// #region Imports

import type { WorkflowGuardId } from './WorkflowGuardId';

// #endregion

export interface IGuardFailure {
  readonly guard: WorkflowGuardId;
  readonly detail: string;
}
