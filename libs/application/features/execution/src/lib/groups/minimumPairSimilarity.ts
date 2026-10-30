// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { itemSimilarity } from './itemSimilarity';

// #endregion

export function minimumPairSimilarity(items: readonly IWorkItem[]): number {
  let minimum = 1;
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      minimum = Math.min(minimum, itemSimilarity(items[left]!, items[right]!));
    }
  }
  return items.length > 1 ? minimum : 0;
}
