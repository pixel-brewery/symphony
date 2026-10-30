// #region Imports

import type { IWorkItem, IWorkItemClaim, WorkItemClaimAcquisition } from '@symphony/domain-work';

// #endregion

/** Coordinates exclusive work-item ownership in the shared provider, not local persistence. */
export interface IWorkItemCoordinationPort {
  coordinatesWorkItem(workItem: IWorkItem): boolean;
  acquireWorkItemClaim(
    workItem: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<WorkItemClaimAcquisition>;
  /** Extends the lease of a claim this orchestrator owns, proving the run is still alive. */
  renewWorkItemClaim?(claim: IWorkItemClaim): Promise<IWorkItemClaim>;
  advanceWorkItemClaim(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
  ): Promise<IWorkItemClaim>;
  releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void>;
  /**
   * Deletes claim references whose lease elapsed and that no live run holds any more.
   *
   * A run that dies without releasing leaves its claim behind, and nothing else ever removes
   * it, so the shared repository accumulates dead claims that outlive every orchestrator that
   * wrote them. The caller passes the claims it still owns; everything else is judged by the
   * lease the claim itself carries.
   */
  releaseAbandonedWorkItemClaims?(
    retainedClaimIds: readonly string[],
    limit?: number,
  ): Promise<number>;
}
