// #region Imports

import type { IVerificationStepResult } from './IVerificationStepResult';

// #endregion

export interface IVerificationRun {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  planId: string;
  revision: string;
  approval: 'once' | 'repository' | 'stored';
  state: 'succeeded' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt: string;
  steps: readonly IVerificationStepResult[];
}
