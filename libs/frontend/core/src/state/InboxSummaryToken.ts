// #region Imports

import { InjectionToken } from '@angular/core';
import type { IInboxSummary } from './IInboxSummary';

// #endregion

/**
 * Resolves the Inbox summary from the feature that owns the Inbox, when it is included.
 *
 * @public
 */
export const INBOX_SUMMARY = new InjectionToken<IInboxSummary>('INBOX_SUMMARY');
