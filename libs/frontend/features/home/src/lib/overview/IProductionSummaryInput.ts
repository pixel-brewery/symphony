// #region Imports

import type { IDeliverySnapshot, IDeliveryTarget } from '@symphony/domain-delivery';

// #endregion

/**
 * What the Production summary reads.
 *
 * @public
 */
export interface IProductionSummaryInput {
  /** Delivery destinations and evidence, as Orbit refreshes them. @public @readonly */
  readonly delivery: IDeliverySnapshot;
  /** Destinations configured in Settings, counted before a refresh reports them. @public @readonly */
  readonly configuredTargets: readonly IDeliveryTarget[];
  /** Workspaces of the active scope. @public @readonly */
  readonly workspaceIds: readonly string[];
  /** The project Orbit shows; absent for every project in scope. @public @readonly */
  readonly repositoryBindingId?: string;
  /** Members of the cluster Orbit's inspector describes by default. @public @readonly */
  readonly clusterItemIds: readonly string[];
}
