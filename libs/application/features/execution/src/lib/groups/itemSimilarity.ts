// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { relationshipTokens } from './relationshipTokens';

// #endregion

export function itemSimilarity(left: IWorkItem, right: IWorkItem): number {
  const leftTokens = relationshipTokens(left);
  const rightTokens = relationshipTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}
