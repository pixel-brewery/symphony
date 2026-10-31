// #region Imports

import type { PullRequestBaseBranchStatus } from '@symphony/domain-delivery';

// #endregion

/**
 * The base-branch statuses the list can be narrowed to; current and unknown branches need no
 * attention, so they are not filterable.
 */
export type PullRequestBaseFilter = Extract<PullRequestBaseBranchStatus, 'behind' | 'conflicting'>;
