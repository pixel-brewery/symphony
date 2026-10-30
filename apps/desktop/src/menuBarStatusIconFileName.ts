// #region Imports

import type { DesktopRequestPayload } from '@symphony/ipc-contracts-desktop';

// #endregion

/** Resolves the macOS template-image filename for a menu-bar status. */
export function menuBarStatusIconFileName(
  status: DesktopRequestPayload<'menu-bar.status.set'>['status'],
): string {
  switch (status) {
    case 'running':
      return 'symphonyRunningTemplate.png';
    case 'failed':
      return 'symphonyFailedTemplate.png';
    case 'idle':
      return 'symphonyTemplate.png';
  }
}
