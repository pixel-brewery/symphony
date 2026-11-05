// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileAccessStatus } from '@symphony/mobile-contracts';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'mobileAccessStatusLabel', standalone: true, pure: false })
export class MobileAccessStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: MobileAccessStatus | undefined): string {
    if (!status || status.state === 'disabled')
      return translateLabel('loc.symphony.labels.mobile.access.is.off.032a42c');
    switch (status.state) {
      case 'starting':
      case 'rebinding':
        return translateLabel('loc.symphony.labels.preparing.mobile.access.e196fbc');
      case 'available':
        return translateLabel('loc.symphony.labels.ready.on.this.wi.fi.network.042d4bf');
      case 'stopping':
        return translateLabel('loc.symphony.labels.stopping.mobile.access.4f59bac');
      case 'unavailable':
        return status.unavailableReason ?? 'Mobile access is unavailable';
    }
  }

  // #endregion
}
