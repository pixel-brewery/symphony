// #region Imports

import type { ICiRun } from '@symphony/domain-ci';
import type { IDeliveryLaunchPlan } from './IDeliveryLaunchPlan';

// #endregion

/**
 * Persisted before dispatch so an interrupted response never becomes a duplicate launch.
 *
 * @public
 */
export interface IDeliveryOperation {
  readonly id: string;
  readonly plan: IDeliveryLaunchPlan;
  readonly state: 'submitting' | 'accepted' | 'uncertain' | 'rejected';
  readonly startedAt: string;
  readonly run?: ICiRun;
  readonly message?: string;
}
