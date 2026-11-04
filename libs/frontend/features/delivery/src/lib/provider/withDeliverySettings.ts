// #region Imports

import type { IFeature } from '@symphony/frontend-core';
import {
  SettingsViewSlot,
  withSettingsEditor,
  withSettingsEditorRoute,
  withSettingsRouteInitializer,
  withSettingsViews,
  type SettingsFeatureKind,
} from '@symphony/frontend-setting';
import { deliveryTargetSearchEntries } from '../settings/deliveryTargetSearchEntries';
import { isRepositorySettingsEditorRequest } from '../settings/isRepositorySettingsEditorRequest';
import { isDeliveryTargetSettingsEditorRequest } from '../settings/isDeliveryTargetSettingsEditorRequest';
import { initializeDeliverySettingsRoute } from '../settings/initializeDeliverySettingsRoute';
import { repositorySearchEntries } from '../settings/repositorySearchEntries';
import { resolveRepositoryEditorRoute } from '../settings/resolveRepositoryEditorRoute';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Contributes the repository and destination cards with one `Search settings` entry per repository
 * and destination, their sheets and the routes that open them (`?repository=` in Repositories,
 * `?repository=&target=` in Delivery destinations). @public
 */
export function withDeliverySettings(): readonly IFeature<SettingsFeatureKind>[] {
  return [
    withSettingsViews({
      id: 'delivery-workspace-settings',
      slot: SettingsViewSlot.Workspace,
      views: [
        {
          id: 'delivery-workspace-repositories',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'repositories',
            get label() {
              return translateLabel('loc.symphony.labels.repositories.1e32af8');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.local.source.code.and.ai.work.approval.eb03fc3',
              );
            },
            order: 30,
          },
          search: [
            {
              id: 'repositories',
              get label() {
                return translateLabel('loc.symphony.labels.repositories.1e32af8');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.add.every.source.code.repository.used.by.this.worksp.be1a6a5',
                );
              },
              keywords: [
                'Add repository',
                'Prepare locally',
                'GitHub',
                'checkout',
                'remove repository',
              ],
            },
          ],
          searchEntries: repositorySearchEntries,
          canActivate: (selection) =>
            selection?.sectionId === 'repositories' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/DeliverySettingsCardView').then(
              (module) => module.DeliverySettingsCardView,
            ),
        },
        {
          id: 'delivery-workspace-destinations',
          order: 10,
          section: {
            scope: 'workspace',
            id: 'delivery',
            get label() {
              return translateLabel('loc.symphony.labels.delivery.destinations.3629ca6');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.production.environments.release.channels.and.deploym.d2fddbd',
              );
            },
            order: 40,
          },
          search: [
            {
              id: 'delivery-destinations',
              get label() {
                return translateLabel('loc.symphony.labels.delivery.destinations.3629ca6');
              },
              get description() {
                return translateLabel(
                  'loc.symphony.labels.choose.which.environments.release.channels.and.insta.d40fdb0',
                );
              },
              keywords: [
                'Add destination',
                'Production',
                'environment',
                'release channel',
                'installation',
                'orbit',
                'deployment workflow',
              ],
            },
          ],
          searchEntries: deliveryTargetSearchEntries,
          canActivate: (selection) =>
            selection?.sectionId === 'delivery' && !!selection.workspaceId,
          loadComponent: () =>
            import('../settings/DeliverySettingsCardView').then(
              (module) => module.DeliverySettingsCardView,
            ),
        },
      ],
    }),
    withSettingsEditor({
      id: 'delivery-repository-editor',
      kind: 'repository',
      width: '600px',
      isRequest: isRepositorySettingsEditorRequest,
      loadComponent: () =>
        import('../settings/DeliverySettingsEditorView').then(
          (module) => module.DeliverySettingsEditorView,
        ),
    }),
    withSettingsEditor({
      id: 'delivery-target-editor',
      kind: 'delivery-target',
      width: '640px',
      isRequest: isDeliveryTargetSettingsEditorRequest,
      loadComponent: () =>
        import('../settings/DeliverySettingsEditorView').then(
          (module) => module.DeliverySettingsEditorView,
        ),
    }),
    withSettingsRouteInitializer({
      id: 'delivery-settings-route',
      initialize: initializeDeliverySettingsRoute,
    }),
    withSettingsEditorRoute({
      id: 'delivery-repository-route',
      section: 'repositories',
      parameter: 'repository',
      resolve: resolveRepositoryEditorRoute,
    }),
  ];
}
