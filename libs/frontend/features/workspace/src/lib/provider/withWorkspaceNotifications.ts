// #region Imports

import {
  withNotificationSources,
  type INotificationContribution,
} from '@symphony/frontend-notification';
import { RepositoryPreparationNotificationSource } from '../notifications/RepositoryPreparationNotificationSource';

// #endregion

/**
 * Contributes repositories that are not prepared locally to the notification centre.
 *
 * @returns The Workspace notification contribution.
 * @public
 */
export function withWorkspaceNotifications(): INotificationContribution {
  return withNotificationSources({
    id: 'workspace-repository-preparation',
    sources: RepositoryPreparationNotificationSource,
  });
}
