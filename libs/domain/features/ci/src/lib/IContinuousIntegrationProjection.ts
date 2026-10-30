// #region Imports

import type { ICiRun } from './ICiRun';
import type { ICiWorkflow } from './ICiWorkflow';

// #endregion

export interface IContinuousIntegrationProjection {
  version: 1;
  workspaceIds: readonly string[];
  ciWorkflows?: readonly ICiWorkflow[];
  ciRuns: readonly ICiRun[];
  refreshedAt: string;
}
