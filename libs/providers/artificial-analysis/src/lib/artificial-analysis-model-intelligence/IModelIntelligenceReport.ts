// #region Imports

import type { IModelIntelligenceScore } from './IModelIntelligenceScore';

// #endregion

export interface IModelIntelligenceReport {
  readonly scores: readonly IModelIntelligenceScore[];
  readonly indexVersion: string | null;
  readonly retrievedAt: string | null;
  readonly error?: string;
}
