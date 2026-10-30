// #region Imports

import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { ISettingsRouteInitializer } from '../routing/ISettingsRouteInitializer';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import type { SettingsFeatureKind } from './SettingsFeatureKind';
import { SettingsFeatureKinds } from './SettingsFeatureKinds';

// #endregion

/** Registers one feature-owned native route effect without a business-kind switch in the host. @public */
export function withSettingsRouteInitializer(
  initializer: ISettingsRouteInitializer,
): IFeature<SettingsFeatureKind> {
  return createFeature(
    initializer.id,
    SettingsFeatureKinds.RouteInitializer,
    [{ provide: SETTINGS_ROUTE_INITIALIZERS, useValue: initializer, multi: true }],
    { multi: true },
  );
}
