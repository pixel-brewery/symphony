// #region Imports

import type { IDeliveryGroup } from '@symphony/domain-execution';
import type { IWorkItem, IWorkItemClaim } from '@symphony/domain-work';
import type { GroupClaimAdmission } from './GroupClaimAdmission';

// #endregion

/** Commands exposed by the single claims owner. @public */
export interface IExecutionClaims {
  renewActiveClaims(): Promise<number>;
  releaseAbandonedClaims(limit?: number): Promise<number>;
  releaseWorkItemClaim(claim: IWorkItemClaim): Promise<void>;
  admitWorkItemClaims(
    items: readonly IWorkItem[],
    action: IWorkItemClaim['action'],
    executionId: string,
    inheritedClaims: readonly IWorkItemClaim[],
    deliveryGroup: IDeliveryGroup | undefined,
  ): Promise<readonly GroupClaimAdmission[]>;
  rollbackAcquiredClaims(admissions: readonly GroupClaimAdmission[]): Promise<void>;
  coordinatesWorkItem(workItem: IWorkItem): boolean;
  acquireWorkItemClaim(
    item: IWorkItem,
    action: IWorkItemClaim['action'],
    executionId: string,
  ): Promise<IWorkItemClaim>;
  advanceClaimForResult(
    claim: IWorkItemClaim,
    action: IWorkItemClaim['action'],
    executionId?: string,
  ): Promise<IWorkItemClaim>;
}
