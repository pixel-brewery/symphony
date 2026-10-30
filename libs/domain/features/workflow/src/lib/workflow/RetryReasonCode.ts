// #region Imports

import { retryReasonCodes } from './RetryReasonCodes';

// #endregion

export type RetryReasonCode = (typeof retryReasonCodes)[number];
