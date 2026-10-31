// #region Imports

import type { IRepositorySettingsEditorRequest } from './IRepositorySettingsEditorRequest';
import type { IDeliveryTargetSettingsEditorRequest } from './IDeliveryTargetSettingsEditorRequest';

// #endregion

/** Delivery's two existing discriminated Settings editor requests. @public */
export type DeliverySettingsEditorRequest =
  IRepositorySettingsEditorRequest | IDeliveryTargetSettingsEditorRequest;
