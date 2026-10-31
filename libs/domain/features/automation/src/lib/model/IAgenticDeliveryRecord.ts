// #region Imports

import type { AgenticDeliveryState } from './AgenticDeliveryState';
import type { CiFailureClassification } from '@symphony/domain-ci';

// #endregion

/** Durable provider-neutral recovery journal for one PR workflow failure. */
export interface IAgenticDeliveryRecord {
  id: string;
  workspaceId: string;
  repositoryBindingId: string;
  ciRunId: string;
  runAttempt: number;
  revision?: string;
  branch?: string;
  pullRequestNumber: number;
  workItemId: string;
  sourceExecutionId: string;
  state: AgenticDeliveryState;
  classification?: CiFailureClassification;
  fingerprint: string;
  attempt: number;
  observedAt: string;
  updatedAt: string;
  diagnosisExecutionId?: string;
  repairExecutionId?: string;
  rerunRequestedAt?: string;
  message?: string;
}
