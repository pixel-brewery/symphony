// #region Imports

import type { MergeMode } from './MergeMode';

// #endregion

export interface IMergePolicy {
  /** `symphony` merges on human acceptance; `external` waits for a merge performed elsewhere. */
  readonly mode: MergeMode;
  readonly strategy: 'merge' | 'squash' | 'rebase';
  readonly deleteBranchAfterMerge: boolean;
  readonly requirePostMergeChecks: boolean;
}
