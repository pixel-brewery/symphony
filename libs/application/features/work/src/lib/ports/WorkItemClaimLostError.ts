/**
 * Raised when this orchestrator provably no longer owns a work item.
 *
 * Ownership ends in more than one way - the claim reference is gone, another instance raised the
 * fencing token, or the recorded owner changed - and all of them mean the same for a running
 * execution: it must stop writing results. A tracker that merely could not be reached proves
 * nothing about ownership and must never be reported through this type, because a transport
 * failure would then end runs that still own their work item.
 */
export class WorkItemClaimLostError extends Error {
  // #region Ctor

  public constructor(
    message: string,
    public readonly workItemExternalId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'WorkItemClaimLostError';
  }

  // #endregion
}
