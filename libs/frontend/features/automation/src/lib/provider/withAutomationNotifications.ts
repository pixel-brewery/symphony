// #region Imports

import {
  withNotificationSources,
  type INotificationContribution,
} from '@symphony/frontend-notification';
import { StoragePressureNotificationSource } from '../notifications/StoragePressureNotificationSource';

// #endregion

/**
 * Contributes storage pressure to the notification centre.
 *
 * @returns The Automation notification contribution.
 * @public
 */
export function withAutomationNotifications(): INotificationContribution {
  return withNotificationSources({
    id: 'automation-storage-pressure',
    sources: StoragePressureNotificationSource,
  });
}
