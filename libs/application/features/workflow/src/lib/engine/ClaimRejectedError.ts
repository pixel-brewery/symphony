// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';

// #endregion

/** A claim-triggered transition whose guards refused the move. The caller must not start work. */
export class ClaimRejectedError extends Error {
  // #region Ctor

  public constructor(
    public readonly workItemExternalId: string,
    public readonly targetStageId: WorkflowStageId,
    rationale: string,
  ) {
    super(`Work item ${workItemExternalId} may not move to ${targetStageId}: ${rationale}`);
    this.name = 'ClaimRejectedError';
  }

  // #endregion
}
