// #region Imports

import type { WritableSignal } from '@angular/core';

// #endregion

/** The existing Settings-session project selection shared across native card remounts. @public */
export interface IDeliverySettingsDraft {
  readonly deliveryRepositoryId: WritableSignal<string>;
}
