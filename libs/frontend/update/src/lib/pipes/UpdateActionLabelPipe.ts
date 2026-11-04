// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { UpdateState } from '@symphony/ipc-contracts-desktop';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'updateActionLabel', standalone: true, pure: false })
export class UpdateActionLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param state - State.
   * @public
   */
  public transform(state: UpdateState | undefined): string {
    if (state?.kind === 'ready')
      return translateLabel(
        'loc.symphony.labels.restart.and.update.to.735f08a',
        state.targetVersion,
      );
    if (state?.kind === 'available')
      return translateLabel('loc.symphony.labels.download.update.2ee3904', state.targetVersion);
    if (state?.kind === 'checking')
      return translateLabel('loc.symphony.labels.checking.for.updates.497a199');
    if (state?.kind === 'downloading')
      return translateLabel('loc.symphony.labels.downloading.update.b99a390');
    return translateLabel('loc.symphony.labels.check.for.updates.f26f327');
  }

  // #endregion
}
