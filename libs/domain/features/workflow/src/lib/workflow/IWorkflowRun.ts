// #region Imports

import type { ProcessRole } from './ProcessRole';

// #endregion

export interface IWorkflowRun {
  readonly id: string;
  readonly role: ProcessRole;
  readonly executionId?: string;
  readonly startedAt: string;
  readonly attempt: number;
  readonly skillVersion: string;
  readonly promptVersion: number;
  readonly customizationHash?: string;
}
