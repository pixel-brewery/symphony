// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { PaletteResultGroup } from '../models/PaletteResultGroup';

// #endregion

/**
 * Names a command palette group as drawn: `WORK ITEMS`, `PULL REQUESTS`, `ACTION RUNS` and
 * `COMMANDS`.
 *
 * @public
 */
@Pipe({ name: 'paletteGroupLabel' })
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
        return 'WORK ITEMS';
      case 'pull-requests':
        return 'PULL REQUESTS';
      case 'action-runs':
        return 'ACTION RUNS';
      case 'commands':
        return 'COMMANDS';
    }
  }

  // #endregion
}
