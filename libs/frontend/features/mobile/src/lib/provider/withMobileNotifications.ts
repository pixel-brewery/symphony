// #region Imports

import {
  withNotificationSources,
  type INotificationContribution,
} from '@symphony/frontend-notification';
import { MobilePairingNotificationSource } from '../notifications/MobilePairingNotificationSource';

// #endregion

/**
 * Contributes phones that ask to pair to the notification centre.
 *
 * @returns The Mobile notification contribution.
 * @public
 */
export function withMobileNotifications(): INotificationContribution {
  return withNotificationSources({
    id: 'mobile-pairing',
    sources: MobilePairingNotificationSource,
  });
}
