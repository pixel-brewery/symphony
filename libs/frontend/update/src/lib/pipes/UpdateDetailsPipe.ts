// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';
import { labelLocale, translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'updateDetails', standalone: true, pure: false })
export class UpdateDetailsPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (!state) return '';
    const checked = state.lastCheckedAt
      ? translateLabel(
          'loc.symphony.labels.checked.20ceeb3',
          new Intl.DateTimeFormat(labelLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(
            new Date(state.lastCheckedAt),
          ),
        )
      : '';
    return translateLabel(
      'loc.symphony.labels.current.version.channel.8cc00e0',
      state.currentVersion,
      state.channel,
      checked,
    );
  }

  // #endregion
}
