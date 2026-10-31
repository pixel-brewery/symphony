// #region Imports

import type { IGuardFailure } from '../workflow/IGuardFailure';
import type { WorkflowGuardId } from '../workflow/WorkflowGuardId';

// #endregion

export function failure(guard: WorkflowGuardId, detail: string): IGuardFailure {
  return { guard, detail };
}
