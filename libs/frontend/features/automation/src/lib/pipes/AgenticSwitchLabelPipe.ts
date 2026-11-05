// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AgenticSwitch } from '../state/agentic-ladder/AgenticSwitch';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Names an agentic switch as the `Fix failed checks` rail labels it, for the `Needs “…”` hint of
 * a switch whose prerequisite is off.
 *
 * @public
 */
@Pipe({ name: 'agenticSwitchLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.enable.agentic.delivery.ad19238');
      case 'observeFailures':
        return translateLabel('loc.symphony.labels.observe.failed.actions.ef3fad6');
      case 'aiDiagnosisEnabled':
        return translateLabel('loc.symphony.labels.use.ai.for.diagnosis.ded8dd2');
      case 'ciRerunEnabled':
        return translateLabel(
          'loc.symphony.labels.rerun.transient.and.infrastructure.failures.3f14e5d',
        );
      case 'managedBranchUpdatesEnabled':
        return translateLabel('loc.symphony.labels.update.managed.pull.request.branches.41a1168');
      case 'sourceRepairEnabled':
        return translateLabel('loc.symphony.labels.repair.source.failures.373d83f');
      case 'workflowRepairEnabled':
        return translateLabel('loc.symphony.labels.repair.workflow.failures.a265f85');
      case 'replacementPullRequestEnabled':
        return translateLabel('loc.symphony.labels.allow.replacement.pull.requests.ac93083');
    }
  }

  // #endregion
}
