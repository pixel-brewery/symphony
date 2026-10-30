// #region Imports

import type { ReasonCode } from './ReasonCode';
import type { RetryReasonCode } from './RetryReasonCode';
import { retryReasonCodes } from './RetryReasonCodes';

// #endregion

export function isRetryReasonCode(reason: ReasonCode): reason is RetryReasonCode {
  return (retryReasonCodes as readonly ReasonCode[]).includes(reason);
}
