// #region Imports

import { inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { composeProviders, CI_OPERATIONS, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { DeliveryLaunchOperations } from '../state/DeliveryLaunchOperations';
import { DELIVERY_LAUNCH_CLIENT } from '../ports/DeliveryLaunchClientToken';
import { DELIVERY_LAUNCH_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import { DELIVERY_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { DeliverySnapshotProjection } from '../state/DeliverySnapshotProjection';
import { DELIVERY_VIEW_CONTEXT } from '../ports/DeliveryViewContextToken';
import type { IDeliveryViewContext } from '../ports/IDeliveryViewContext';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import type { IDeliveryCiOperations } from '../ports/IDeliveryCiOperations';
import { DELIVERY_ROUTE_HYDRATION } from '../ports/DeliveryRouteHydrationToken';
import { createDeliveryRouteHydration } from './createDeliveryRouteHydration';
import { DELIVERY_CLIENT } from '../ports/DeliveryClientToken';
import { DELIVERY_PROJECTION } from '../ports/DeliveryProjectionToken';
import { PullRequestStore } from '../state/PullRequestStore';
import { withDeliveryNavigation } from './withDeliveryNavigation';
import { withDeliverySearch } from './withDeliverySearch';
import { withDeliveryWidgets } from './withDeliveryWidgets';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { DELIVERY_SETTINGS_CONFIGURATION } from '../ports/DeliverySettingsConfigurationToken';
import { DELIVERY_SETTINGS_CLIENT } from '../ports/DeliverySettingsClientToken';
import { DELIVERY_REPOSITORY_RUNTIME } from '../ports/DeliveryRepositoryRuntimeToken';
import type { IDeliveryRepositoryRuntime } from '../ports/IDeliveryRepositoryRuntime';
import { createDeliverySettingsContext } from './createDeliverySettingsContext';
import { createDeliverySettingsConfiguration } from './createDeliverySettingsConfiguration';
import { withDeliverySettings } from './withDeliverySettings';
import { withDeliveryQuickCreate } from './withDeliveryQuickCreate';

// #endregion

/**
 * Registers the single Delivery operation owner and its bounded transport dependencies.
 *
 * @returns The actual Delivery operation and busy-state providers.
 * @public
 */
export function provideDeliveryFeature(): EnvironmentProviders {
  return makeEnvironmentProviders(
    composeProviders(
      [
        PullRequestStore,
        DeliveryLaunchOperations,
        { provide: DELIVERY_LAUNCH_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: DELIVERY_LAUNCH_OPERATIONS, useExisting: DeliveryLaunchOperations },
        { provide: DELIVERY_SETTINGS_CONTEXT, useFactory: createDeliverySettingsContext },
        {
          provide: DELIVERY_SETTINGS_CONFIGURATION,
          useFactory: createDeliverySettingsConfiguration,
        },
        { provide: DELIVERY_SETTINGS_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        {
          provide: DELIVERY_REPOSITORY_RUNTIME,
          useFactory: (): IDeliveryRepositoryRuntime | null =>
            inject(REPOSITORY_RUNTIME_OPERATIONS, { optional: true }),
        },
        DeliverySnapshotProjection,
        {
          provide: DELIVERY_VIEW_CONTEXT,
          useFactory: (): IDeliveryViewContext => inject(ApplicationProjection),
        },
        {
          provide: DELIVERY_CI_OPERATIONS,
          useFactory: (): IDeliveryCiOperations | null => inject(CI_OPERATIONS, { optional: true }),
        },
        { provide: DELIVERY_ROUTE_HYDRATION, useFactory: createDeliveryRouteHydration },
        { provide: DELIVERY_CLIENT, useExisting: ORCHESTRATION_CLIENT },
        { provide: DELIVERY_PROJECTION, useExisting: DeliverySnapshotProjection },
        { provide: DELIVERY_OPERATIONS, useExisting: PullRequestStore },
        ...[
          withDeliveryNavigation(40),
          withDeliverySearch(),
          withDeliveryWidgets(),
          withDeliveryQuickCreate(),
        ].flatMap((feature) => feature.provide()),
      ],
      withDeliverySettings(),
    ),
  );
}
