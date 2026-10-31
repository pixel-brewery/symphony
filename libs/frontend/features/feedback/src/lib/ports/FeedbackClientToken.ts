// #region Imports

import { InjectionToken } from '@angular/core';
import type { IFeedbackClient } from './IFeedbackClient';

// #endregion

/** Typed Feedback transport supplied at product composition. @public */
export const FEEDBACK_CLIENT = new InjectionToken<IFeedbackClient>('FEEDBACK_CLIENT');
