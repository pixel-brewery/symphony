// #region Imports

import type { IWorkTrackingProjection } from '@symphony/domain-work';
import type { IWorkItemDetailProjection } from './IWorkItemDetailProjection';

// #endregion

/** Durable work-tracking summaries and optional hydrated item details. */
export interface IWorkTrackingProjectionRepository {
  loadWorkTracking(scope: string): IWorkTrackingProjection | undefined;
  saveWorkTracking(scope: string, projection: IWorkTrackingProjection): void;
  loadWorkItemDetail?(scope: string, workItemId: string): IWorkItemDetailProjection | undefined;
  saveWorkItemDetail?(scope: string, projection: IWorkItemDetailProjection): void;
}
