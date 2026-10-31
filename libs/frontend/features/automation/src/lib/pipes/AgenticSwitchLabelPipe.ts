// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AgenticSwitch } from '../state/agentic-ladder/AgenticSwitch';

// #endregion

/**
 * Names an agentic switch as the `Fix failed checks` rail labels it, for the `Needs “…”` hint of
 * a switch whose prerequisite is off.
 *
 * @public
 */
@Pipe({ name: 'agenticSwitchLabel', standalone: true, pure: true })
export class AgenticSwitchLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a switch into its label.
   *
   * @param key - The switch.
   * @public
   */
  public transform(key: AgenticSwitch): string {
    switch (key) {
      case 'enabled':
        return 'Enable agentic delivery';
      case 'observeFailures':
        return 'Observe failed actions';
      case 'aiDiagnosisEnabled':
        return 'Use AI for diagnosis';
      case 'ciRerunEnabled':
        return 'Rerun transient and infrastructure failures';
      case 'managedBranchUpdatesEnabled':
        return 'Update managed pull-request branches';
      case 'sourceRepairEnabled':
        return 'Repair source failures';
      case 'workflowRepairEnabled':
        return 'Repair workflow failures';
      case 'replacementPullRequestEnabled':
        return 'Allow replacement pull requests';
    }
  }

  // #endregion
}
