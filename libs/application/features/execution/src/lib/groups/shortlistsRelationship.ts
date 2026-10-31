// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { itemSimilarity } from './itemSimilarity';

// #endregion

export function shortlistsRelationship(items: readonly [IWorkItem, IWorkItem]): boolean {
  const [left, right] = items;
  const paths = (item: IWorkItem): ReadonlySet<string> =>
    new Set(`${item.title}\n${item.body}`.match(/(?:[\w.-]+\/)+[\w.-]+/gu) ?? []);
  const leftPaths = paths(left);
  if ([...leftPaths].some((path) => paths(right).has(path))) return true;
  const sharedLabels = left.labels.some((label) => right.labels.includes(label));
  return itemSimilarity(left, right) >= (sharedLabels ? 0.15 : 0.25);
}
