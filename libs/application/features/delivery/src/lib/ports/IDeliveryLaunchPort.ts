// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IDeliveryLaunchPlan } from '@symphony/domain-delivery';

// #endregion

/**
 * Provides version checks, explicit dispatch and read-only evidence for delivery launches.
 *
 * @public
 */
export interface IDeliveryLaunchPort {
  /**
   * Reads the current state of a previously observed delivery run.
   *
   * @param plan - Original target and source-control evidence.
   * @param runId - Exact provider-neutral run identifier.
   * @returns The current run evidence.
   * @public
   */
  readRun(plan: IDeliveryLaunchPlan, runId: string): Promise<ICiRun>;
  /**
   * Resolves a configured target and requested reference into an explicit launch plan.
   *
   * @param targetId - Configured delivery target identifier.
   * @param ref - Requested source-control reference.
   * @returns Validated target, workflow and version evidence.
   * @public
   */
  preview(targetId: string, ref: string): Promise<IDeliveryLaunchPlan>;
  /**
   * Rejects stale or inadmissible launch evidence before an intent is persisted or dispatched.
   *
   * @param plan - Exact launch evidence to revalidate.
   * @returns Completion after every preflight check succeeds.
   * @public
   */
  check(plan: IDeliveryLaunchPlan): Promise<void>;
  /**
   * Dispatches one already journaled delivery intent.
   *
   * @param plan - Exact target, workflow and version evidence.
   * @param operationId - Stable caller-owned identifier of the persisted intent.
   * @returns The run accepted by the provider.
   * @public
   */
  dispatch(plan: IDeliveryLaunchPlan, operationId: string): Promise<ICiRun>;
  /**
   * Searches provider evidence for a recorded intent without repeating its mutation.
   *
   * @param plan - Original target, workflow and version evidence.
   * @param startedAt - Original launch timestamp.
   * @param operationId - Stable identifier of the recorded intent.
   * @returns A proven matching run, or no proof when the intent remains uncertain.
   * @public
   */
  reconcile(
    plan: IDeliveryLaunchPlan,
    startedAt: string,
    operationId: string,
  ): Promise<ICiRun | undefined>;
}
