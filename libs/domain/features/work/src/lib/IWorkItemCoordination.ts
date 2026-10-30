// #region Imports

import type { AssistanceAction } from './AssistanceAction';

// #endregion

/** Read-only projection of shared work-item ownership discovered from the provider. */
export interface IWorkItemCoordination {
  readonly state: 'claimed';
  readonly claimId: string;
  readonly action: Exclude<AssistanceAction, 'none' | 'create'>;
  readonly owner?: string;
  readonly leaseUntil?: string;
  readonly claimVersion?: number;
  /** True when the lease elapsed, so the claim may be taken over instead of respected. */
  readonly expired?: boolean;
}
