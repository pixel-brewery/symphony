// #region Imports

import type { ReasonCode } from './ReasonCode';
import type { ReworkReasonCode } from './ReworkReasonCode';
import { reworkReasonCodes } from './ReworkReasonCodes';

// #endregion

export function isReworkReasonCode(reason: ReasonCode): reason is ReworkReasonCode {
  return (reworkReasonCodes as readonly ReasonCode[]).includes(reason);
}
