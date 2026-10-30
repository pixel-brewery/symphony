// #region Imports

import type { IDeliveryGroup, IExecutionRecord, IGoalRecord } from '@symphony/domain-execution';

// #endregion

/**
 * Exposes only the execution and delivery evidence consumed by automation policy.
 *
 * @public
 */
export interface IAutomationExecutionRepository {
  /**
   * Reads retained executions for capacity, recovery and attempt qualification.
   *
   * @public
   */
  listExecutions(): readonly IExecutionRecord[];

  /**
   * Records the execution evidence produced by an admitted automation operation.
   *
   * @public
   */
  saveExecution(execution: IExecutionRecord): void;

  /**
   * Reads grouped delivery ownership before synchronizing members or reserving surfaces.
   *
   * @public
   */
  listDeliveryGroups(): readonly IDeliveryGroup[];

  /**
   * Persists the observed completion of an existing delivery group.
   *
   * @public
   */
  saveDeliveryGroup(group: IDeliveryGroup): void;

  /**
   * Reads retained goals and their measured verification evidence.
   *
   * @public
   */
  listGoals(): readonly IGoalRecord[];
}
