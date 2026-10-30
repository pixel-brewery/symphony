// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';

// #endregion

@Pipe({ name: 'updateStatusLabel', standalone: true, pure: true })
export class UpdateStatusLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (!state) return 'Loading update status…';
    switch (state.kind) {
      case 'disabled':
        return state.reason === 'unsupported-platform'
          ? 'Updates are installed through the operating-system package manager.'
          : state.reason === 'development'
            ? 'Automatic updates are disabled in development builds.'
            : 'This build does not have a release feed configured.';
      case 'idle':
        return state.lastCheckedAt ? 'Symphony is up to date.' : 'Automatic checks are active.';
      case 'checking':
        return 'Checking for updates…';
      case 'available':
        return `Version ${state.targetVersion} is available to download.`;
      case 'downloading':
        return 'Downloading a new version in the background…';
      case 'ready':
        return `Version ${state.targetVersion} is ready to install.`;
      case 'failed':
        return state.message;
    }
  }

  // #endregion
}
