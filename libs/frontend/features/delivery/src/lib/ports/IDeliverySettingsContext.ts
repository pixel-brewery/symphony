// #region Imports

import type { Signal } from '@angular/core';
import type { ICiWorkflow } from '@symphony/domain-ci';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Existing configuration and workflow facts consumed by Delivery settings. @public */
export interface IDeliverySettingsContext {
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  readonly snapshot: Signal<{ readonly ciWorkflows?: readonly ICiWorkflow[] } | undefined>;
  readonly configurationBusy: Signal<boolean>;
  readonly editorBusy: Signal<boolean>;
}
