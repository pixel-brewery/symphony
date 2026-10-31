// #region Imports

import type { IModelIntelligenceScore } from './IModelIntelligenceScore';
import type { IModelIntelligenceTarget } from './IModelIntelligenceTarget';

// #endregion

export function unscored(target: IModelIntelligenceTarget): IModelIntelligenceScore {
  return { ...target, intelligenceIndex: null, matchedModelName: null };
}
