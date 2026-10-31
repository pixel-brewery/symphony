// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type {
  ApplicationSettingsDto,
  IOrchestrationSnapshot,
} from '@symphony/ipc-contracts-composition';
import type { IWorkFilters } from '@symphony/frontend-core/work';
import type { IDeliveryLaunchOperations } from '@symphony/frontend-core/delivery-operations';

// #endregion

/** Explicit shared scope and commands consumed by the Orbit presenter. @public */
export interface IOrbitContext {
  /** Work's actual filter participant, absent when that feature is omitted. @public @readonly */
  readonly workFilters: IWorkFilters | null;
  /** Delivery's actual query/launch participant, absent when that feature is omitted. @public @readonly */
  readonly delivery: IDeliveryLaunchOperations | null;
  /** The existing validated process snapshot. @public @readonly */
  readonly snapshot: Signal<IOrchestrationSnapshot | undefined>;
  /** Authoritative configuration read live for each projection. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** Active configured workspace identifiers. @public @readonly */
  readonly selectedWorkspaceIds: Signal<readonly string[]>;
  /** Enabled repositories in that configured scope. @public @readonly */
  readonly scopedRepositories: Signal<readonly IRepositoryBinding[]>;
  /** Work projection supplied only when Work is included. @public @readonly */
  readonly scopedWorkItems: Signal<readonly IWorkItem[]>;
  /** The same selected item owned by Work. @public @readonly */
  readonly selectedWorkItem: Signal<IWorkItem | undefined>;
  /** Whether that selection was explicit. @public @readonly */
  readonly selectionExplicit: Signal<boolean>;
  /** Joins the existing once-only application bootstrap. @public */
  initialize(): Promise<void>;
  /** Delegates explicit item selection to its owning feature. @public */
  selectWorkItem(workItemId: string | undefined): void;
  /** Refreshes CI when that optional feature is included. @public */
  refreshContinuousIntegrationRuns(): Promise<void>;
}
