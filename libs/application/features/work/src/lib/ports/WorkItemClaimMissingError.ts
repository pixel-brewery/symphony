// #region Imports

import { WorkItemClaimLostError } from './WorkItemClaimLostError';

// #endregion

/**
 * Raised when the shared claim a caller still holds is gone from the provider.
 *
 * A claim reference disappears whenever another orchestrator released or took the work item
 * over, so this is a recoverable ownership fact and not a provider fault: the caller drops the
 * stale claim and acquires a new one instead of surfacing a transport error.
 */
export class WorkItemClaimMissingError extends WorkItemClaimLostError {
  // #region Ctor

  public constructor(
    workItemExternalId: string,
    public readonly claimId: string,
    options?: ErrorOptions,
  ) {
    super(
      `The distributed claim for ${workItemExternalId} no longer exists; it was released or taken over elsewhere.`,
      workItemExternalId,
      options,
    );
    this.name = 'WorkItemClaimMissingError';
  }

  // #endregion
}
