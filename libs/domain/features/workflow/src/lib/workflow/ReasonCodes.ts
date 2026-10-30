// #region Imports

import type { ReasonCode } from './ReasonCode';
import { blockedReasonCodes } from './BlockedReasonCodes';
import { closureReasonCodes } from './ClosureReasonCodes';
import { fatalReasonCodes } from './FatalReasonCodes';
import { humanRequiredReasonCodes } from './HumanRequiredReasonCodes';
import { retryReasonCodes } from './RetryReasonCodes';
import { reworkReasonCodes } from './ReworkReasonCodes';

// #endregion

export const reasonCodes: readonly ReasonCode[] = [
  ...retryReasonCodes,
  ...reworkReasonCodes,
  ...blockedReasonCodes,
  ...fatalReasonCodes,
  ...humanRequiredReasonCodes,
  ...closureReasonCodes,
];
