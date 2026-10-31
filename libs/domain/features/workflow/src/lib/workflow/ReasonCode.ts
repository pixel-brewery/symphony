// #region Imports

import type { BlockedReasonCode } from './BlockedReasonCode';
import type { ClosureReasonCode } from './ClosureReasonCode';
import type { FatalReasonCode } from './FatalReasonCode';
import type { HumanRequiredReasonCode } from './HumanRequiredReasonCode';
import type { RetryReasonCode } from './RetryReasonCode';
import type { ReworkReasonCode } from './ReworkReasonCode';

// #endregion

export type ReasonCode =
  | RetryReasonCode
  | ReworkReasonCode
  | BlockedReasonCode
  | FatalReasonCode
  | HumanRequiredReasonCode
  | ClosureReasonCode;
