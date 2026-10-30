// #region Imports

import type {
  IAutomationReceipt,
  IAutomationSignal,
  IAutomationSourceCheckpoint,
} from '@symphony/domain-automation';
import type { IDeliveryGroup } from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';

// #endregion

/**
 * Exposes only tracker observations and acknowledgements consumed by automation policy.
 *
 * @public
 */
export interface IAutomationTrackingPort {
  /**
   * Reads the board items considered by one autonomous cycle.
   *
   * @public
   */
  listWorkItems(): Promise<readonly IWorkItem[]>;

  /**
   * Mirrors an existing grouped delivery after its pull request proves completion.
   *
   * @public
   */
  synchronizeDeliveryGroup?(group: IDeliveryGroup, workItems: readonly IWorkItem[]): Promise<void>;

  /**
   * Reads remote instructions after the retained source checkpoints.
   *
   * @public
   */
  listAutomationSignals?(
    checkpoints?: readonly IAutomationSourceCheckpoint[],
  ): Promise<readonly IAutomationSignal[]>;

  /**
   * Reads the enabled automation sources whose initial state must be baselined.
   *
   * @public
   */
  listAutomationSources?(): Promise<
    readonly Pick<IAutomationSourceCheckpoint, 'sourceId' | 'workspaceId'>[]
  >;

  /**
   * Acknowledges the durable policy outcome of one remote instruction when supported.
   *
   * @public
   */
  acknowledgeAutomationSignal?(
    signal: IAutomationSignal,
    state: IAutomationReceipt['state'],
  ): Promise<void>;
}
