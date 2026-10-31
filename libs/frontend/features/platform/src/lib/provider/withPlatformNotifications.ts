// #region Imports

import {
  withNotificationSources,
  type INotificationContribution,
} from '@symphony/frontend-notification';
import { DeveloperToolsNotificationSource } from '../notifications/DeveloperToolsNotificationSource';

// #endregion

/**
 * Contributes the missing developer CLIs to the notification centre.
 *
 * @returns The Platform notification contribution.
 * @public
 */
export function withPlatformNotifications(): INotificationContribution {
  return withNotificationSources({
    id: 'platform-developer-tools',
    sources: DeveloperToolsNotificationSource,
  });
}
