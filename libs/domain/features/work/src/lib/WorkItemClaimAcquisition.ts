// #region Imports

import type { IWorkItemClaim } from './IWorkItemClaim';

// #endregion

/** Result of atomically acquiring shared ownership for a work item. */
export type WorkItemClaimAcquisition =
  | { readonly status: 'acquired'; readonly claim: IWorkItemClaim }
  | { readonly status: 'contended' };
