// #region Imports

import type { IAgenticDeliveryPolicy } from '@symphony/domain-automation';

// #endregion

/**
 * One of the eight agentic switches that form the `Fix failed checks` ladder.
 *
 * @public
 */
export type AgenticSwitch = keyof Pick<
  IAgenticDeliveryPolicy,
  | 'enabled'
  | 'observeFailures'
  | 'aiDiagnosisEnabled'
  | 'ciRerunEnabled'
  | 'managedBranchUpdatesEnabled'
  | 'sourceRepairEnabled'
  | 'workflowRepairEnabled'
  | 'replacementPullRequestEnabled'
>;
