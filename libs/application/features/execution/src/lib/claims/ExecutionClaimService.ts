// #region Imports

import type { IDeliveryGroup } from '@symphony/domain-execution';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import { WorkItemClaimLostError, WorkItemClaimMissingError } from '@symphony/application-work';
import type { GroupClaimAdmission } from './GroupClaimAdmission';
import type { IExecutionClaims } from './IExecutionClaims';
import type { IExecutionClaimsDependencies } from './IExecutionClaimsDependencies';

// #endregion

/** Coordinates distributed Work Item claims for executions. @public */
export class ExecutionClaimService implements IExecutionClaims {
  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionClaimsDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Extends the shared lease of every running execution.
   *
   * The lease lives in the provider claim, so a second orchestrator reads it to tell a live
   * run from a crashed one. Renewing on a timer - not only on agent progress - keeps a long
   * quiet step from looking abandoned.
   *
   * @public
   */
  public async renewActiveClaims(): Promise<number> {
    const renew = this._dependencies.coordination.renewWorkItemClaim;
    if (!renew) return 0;
    let renewed = 0;
    for (const execution of this._dependencies.repository.listExecutions()) {
      const claim = execution.workItemClaim;
      if (!claim || claim.releasedAt || !this._dependencies.isActive(execution.state)) continue;
      try {
        const extended = await renew.call(this._dependencies.coordination, claim);
        this._dependencies.repository.saveExecution({
          ...this._dependencies.latestExecution(execution.id),
          workItemClaim: extended,
          lastHeartbeatAt: this._dependencies.clock.now(),
        });
        renewed += 1;
      } catch (cause) {
        // Losing the claim means another orchestrator took the work item over; the run must stop
        // rather than keep writing against a superseded claim. A tracker that could not be
        // reached proves nothing about ownership, so the run keeps its claim and the next tick
        // tries again - ending a long analysis over a transient renewal failure would throw away
        // everything the run has earned, and a lease that really lapses is reported as lost by
        // one of the following renewals anyway.
        if (cause instanceof WorkItemClaimLostError) {
          await this._dependencies.finishFailedExecution(
            execution,
            cause,
            'The distributed claim for this work item was lost.',
          );
          continue;
        }
        await this._dependencies.record(
          execution.id,
          'execution.warning',
          `The claim lease could not be renewed and will be retried: ${
            cause instanceof Error ? cause.message : 'unknown work-tracker error'
          }`,
        );
      }
    }
    return renewed;
  }

  /**
   * Frees claim references that outlived the runs that wrote them.
   *
   * Claims are released on the paths that end a run, but a crash, a lost machine, or a failed
   * release leaves the reference behind for good. A slow sweep keeps the shared repository from
   * collecting one dead claim per lost run; live claims are named as retained and never touched.
   *
   * @param limit - Limit.
   * @public
   */
  public async releaseAbandonedClaims(limit?: number): Promise<number> {
    const sweep = this._dependencies.coordination.releaseAbandonedWorkItemClaims;
    if (!sweep) return 0;
    const retained = this._dependencies.repository
      .listExecutions()
      .flatMap((execution) =>
        execution.workItemClaim &&
        !execution.workItemClaim.releasedAt &&
        this._dependencies.isActive(execution.state)
          ? [execution.workItemClaim.id]
          : [],
      );
    return sweep.call(this._dependencies.coordination, retained, limit);
  }

  /**
   * Continues the claim the previous step left behind, or takes a fresh one.
   *
   * A failed step keeps its claim on purpose so the retry stays the same owner. By then the
   * shared reference may be gone - released elsewhere, taken over, or swept as abandoned - and
   * that is an ownership fact, not a transport fault. The dead claim is written off as released
   * and the step claims the work item anew, instead of ending the operator's retry with a
   * provider error about a reference they never saw.
   */
  private async continueOrAcquireClaim(
    item: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
    inherited: IWorkItemClaim | undefined,
    coordinationRequired: boolean,
  ): Promise<{ readonly claim?: IWorkItemClaim; readonly acquired: boolean }> {
    if (inherited) {
      try {
        return {
          claim: await this._dependencies.coordination.advanceWorkItemClaim(inherited, action),
          acquired: false,
        };
      } catch (cause) {
        if (!(cause instanceof WorkItemClaimMissingError)) throw cause;
        this.recordClaimReleased(inherited);
      }
    }
    if (!coordinationRequired) return { acquired: false };
    return { claim: await this.acquireWorkItemClaim(item, action, executionId), acquired: true };
  }

  /** Acquires the grouped claims and rolls back an incomplete admission. @public */
  public async admitWorkItemClaims(
    items: readonly IWorkItem[],
    action: IWorkItemClaim['action'],
    executionId: string,
    inheritedClaims: readonly IWorkItemClaim[],
    deliveryGroup: IDeliveryGroup | undefined,
  ): Promise<readonly GroupClaimAdmission[]> {
    const admissions: GroupClaimAdmission[] = [];
    try {
      for (const item of [...items].sort((left, right) => left.id.localeCompare(right.id))) {
        const inherited = inheritedClaims.find((claim) => claim.workItemId === item.id);
        const admission = await this.continueOrAcquireClaim(
          item,
          action,
          executionId,
          inherited,
          this._dependencies.coordination.coordinatesWorkItem(item),
        );
        admissions.push({ item, ...admission });
      }
      return admissions;
    } catch (cause) {
      await this.rollbackAcquiredClaims(admissions);
      if (deliveryGroup) this._dependencies.pauseDeliveryGroup(deliveryGroup, 'claim-conflict');
      throw cause;
    }
  }

  /** Releases only claims newly acquired by an incomplete admission. @public */
  public async rollbackAcquiredClaims(admissions: readonly GroupClaimAdmission[]): Promise<void> {
    for (const admission of [...admissions].reverse()) {
      if (admission.acquired && admission.claim) {
        await this._dependencies.coordination
          .releaseWorkItemClaim(admission.claim)
          .catch(() => undefined);
      }
    }
  }

  /** Hands a retained claim to the role consuming the completed result. @public */
  /**
   * Hands a finished step's claim to the next role without letting a lost claim discard it.
   *
   * The result is already earned when this runs, so a claim reference that disappeared during
   * the step is recorded as released and the result is kept - only ownership ends, not the work.
   */
  public async advanceClaimForResult(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
    executionId?: string,
  ): Promise<IWorkItemClaim> {
    try {
      return await this._dependencies.coordination.advanceWorkItemClaim(claim, action);
    } catch (cause) {
      // Ownership is worth less than the result. A tracker failure here would otherwise discard a
      // finished analysis that took hours to produce, so the claim is written off, the reason is
      // recorded, and the next step acquires a claim of its own.
      if (!(cause instanceof WorkItemClaimMissingError) && executionId) {
        await this._dependencies.record(
          executionId,
          'execution.warning',
          `The work-item claim could not be handed to the next step: ${
            cause instanceof Error ? cause.message : 'unknown work-tracker error'
          } The result was kept and the claim was released.`,
        );
      }
      this.recordClaimReleased(claim);
      return { ...claim, releasedAt: this._dependencies.clock.now() };
    }
  }

  /**
   * Writes a vanished claim off on every execution that still holds it.
   *
   * Without this the same dead claim is inherited again by the next start, and the local record
   * keeps claiming an ownership that the provider gave up long ago.
   */
  private recordClaimReleased(claim: IWorkItemClaim): void {
    for (const execution of this._dependencies.repository.listExecutions()) {
      const groupedClaims = execution.workItemClaims;
      const groupedMatch = groupedClaims?.some(
        (candidate) => candidate.id === claim.id && !candidate.releasedAt,
      );
      const rootMatch =
        execution.workItemClaim?.id === claim.id && !execution.workItemClaim.releasedAt;
      if (!groupedMatch && !rootMatch) continue;
      const releasedAt = this._dependencies.clock.now();
      this._dependencies.repository.saveExecution({
        ...execution,
        ...(rootMatch ? { workItemClaim: { ...execution.workItemClaim!, releasedAt } } : {}),
        ...(groupedClaims
          ? {
              workItemClaims: groupedClaims.map((candidate) =>
                candidate.id === claim.id ? { ...candidate, releasedAt } : candidate,
              ),
            }
          : {}),
      });
    }
  }

  /** Acquires provider ownership or reports the contending owner. @public */
  public async acquireWorkItemClaim(
    item: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<IWorkItemClaim> {
    const acquisition = await this._dependencies.coordination.acquireWorkItemClaim(
      item,
      action,
      executionId,
    );
    if (acquisition.status === 'contended') {
      throw new Error(`Work item ${item.externalId} is claimed by another Symphony instance.`);
    }
    return acquisition.claim;
  }

  /** Determines whether this Work Item participates in provider coordination. @public */
  public coordinatesWorkItem(workItem: IWorkItem): boolean {
    return this._dependencies.coordination.coordinatesWorkItem(workItem);
  }

  /** Releases the execution claim through its provider owner. @public */
  public releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void> {
    return this._dependencies.coordination.releaseWorkItemClaim(claim);
  }

  // #endregion
}
