// #region Imports

import type { IClaimPolicy } from './IClaimPolicy';
import type { IEscalationPolicy } from './IEscalationPolicy';
import type { ILoopLimitPolicy } from './ILoopLimitPolicy';
import type { IMergePolicy } from './IMergePolicy';
import type { IRetryPolicy } from './IRetryPolicy';

// #endregion

export interface IWorkflowPolicies {
  readonly retry: IRetryPolicy;
  readonly loopLimits: ILoopLimitPolicy;
  readonly merge: IMergePolicy;
  readonly humanRequired: IEscalationPolicy;
  readonly claim: IClaimPolicy;
}
