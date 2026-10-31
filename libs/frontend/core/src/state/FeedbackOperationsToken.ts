// #region Imports

import { InjectionToken } from '@angular/core';
import type { IFeedbackOperations } from './IFeedbackOperations';

// #endregion

/** Optional Feedback contribution consumed by aggregate settings exclusion. @public */
export const FEEDBACK_OPERATIONS = new InjectionToken<IFeedbackOperations>('FEEDBACK_OPERATIONS');
