// #region Imports

import {
  withNotificationSources,
  type INotificationContribution,
} from '@symphony/frontend-notification';
import { AiAccountNotificationSource } from '../notifications/AiAccountNotificationSource';

// #endregion

/**
 * Contributes signed-out AI accounts to the notification centre.
 *
 * @returns The AI notification contribution.
 * @public
 */
export function withAiNotifications(): INotificationContribution {
  return withNotificationSources({ id: 'ai-accounts', sources: AiAccountNotificationSource });
}
