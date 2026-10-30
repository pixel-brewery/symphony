// #region Imports

import { InjectionToken } from '@angular/core';
import type { IFeedbackSettingsContext } from './IFeedbackSettingsContext';

// #endregion

/** The live configuration dependency of Feedback settings. @public */
export const FEEDBACK_SETTINGS_CONTEXT = new InjectionToken<IFeedbackSettingsContext>(
  'FEEDBACK_SETTINGS_CONTEXT',
);
