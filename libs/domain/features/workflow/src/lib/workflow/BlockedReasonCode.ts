// #region Imports

import { blockedReasonCodes } from './BlockedReasonCodes';

// #endregion

export type BlockedReasonCode = (typeof blockedReasonCodes)[number];
