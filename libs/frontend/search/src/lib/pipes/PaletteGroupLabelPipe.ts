// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PaletteResultGroup } from '../models/PaletteResultGroup';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names a command palette group as drawn: `WORK ITEMS`, `PULL REQUESTS`, `ACTION RUNS` and
 * `COMMANDS`.
 *
 * @public
 */
@Pipe({ pure: false, name: 'paletteGroupLabel' })
export class PaletteGroupLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Returns the group's heading.
   *
   * @param group - Palette result group.
   * @returns The heading shown above the group's rows.
   * @public
   */
  public transform(group: PaletteResultGroup): string {
    switch (group) {
      case 'work-items':
        return translateLabel('loc.symphony.labels.work.items.0388f67');
      case 'pull-requests':
        return translateLabel('loc.symphony.labels.pull.requests.334b280');
      case 'action-runs':
        return translateLabel('loc.symphony.labels.action.runs.fe229f9');
      case 'commands':
        return translateLabel('loc.symphony.labels.commands.92e37c5');
    }
  }

  // #endregion
}
