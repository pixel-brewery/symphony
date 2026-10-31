// #region Imports

import type { IWorkItem } from '@symphony/domain-work';
import { relationshipStopWords } from './RelationshipStopWords';

// #endregion

export function relationshipTokens(item: IWorkItem): ReadonlySet<string> {
  return new Set(
    `${item.title}\n${item.body}`
      .toLocaleLowerCase('en')
      .match(/[\p{L}\p{N}_-]{3,}/gu)
      ?.filter((token) => !relationshipStopWords.has(token)) ?? [],
  );
}
