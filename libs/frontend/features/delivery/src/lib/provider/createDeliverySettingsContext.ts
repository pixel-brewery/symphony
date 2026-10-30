// #region Imports

import { inject } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import type { IDeliverySettingsContext } from '../ports/IDeliverySettingsContext';

// #endregion

/** Supplies readonly facts from their current single owners without copying state. @internal */
export function createDeliverySettingsContext(): IDeliverySettingsContext {
  const configuration = inject(ConfigurationStore),
    projection = inject(ApplicationProjection);
  return {
    settings: configuration.settings,
    snapshot: projection.snapshot,
    configurationBusy: configuration.configurationBusy,
    editorBusy: configuration.editorBusy,
  };
}
