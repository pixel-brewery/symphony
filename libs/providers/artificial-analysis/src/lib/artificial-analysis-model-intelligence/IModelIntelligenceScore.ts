// #region Imports

import type { IModelIntelligenceTarget } from './IModelIntelligenceTarget';

// #endregion

export interface IModelIntelligenceScore extends IModelIntelligenceTarget {
  readonly intelligenceIndex: number | null;
  readonly matchedModelName: string | null;
}
