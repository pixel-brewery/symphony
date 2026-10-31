// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { MobileAccessStatus } from '@symphony/mobile-contracts';

// #endregion

@Pipe({ name: 'mobileAccessStatusLabel', standalone: true, pure: true })
export class MobileAccessStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param status - Status.
   * @public
   */
  public transform(status: MobileAccessStatus | undefined): string {
    if (!status || status.state === 'disabled') return 'Mobile access is off';
    switch (status.state) {
      case 'starting':
      case 'rebinding':
        return 'Preparing mobile access…';
      case 'available':
        return 'Ready on this Wi-Fi network';
      case 'stopping':
        return 'Stopping mobile access…';
      case 'unavailable':
        return status.unavailableReason ?? 'Mobile access is unavailable';
    }
  }

  // #endregion
}
