// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AgentAvailability } from '../models/AgentAvailability';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * Labels an agent's availability on its card.
 *
 * @public
 */
@Pipe({ name: 'agentAvailabilityLabel', standalone: true, pure: false })
export class AgentAvailabilityLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the availability into its label.
   *
   * @param availability - Availability of the agent.
   * @public
   */
  public transform(availability: AgentAvailability): string {
    switch (availability) {
      case 'available':
        return translateLabel('loc.symphony.labels.available.e674447');
      case 'backup-in-use':
        return translateLabel(
          'loc.symphony.labels.backup.in.use.preferred.account.out.of.quota.c764020',
        );
      case 'out-of-quota':
        return translateLabel('loc.symphony.labels.out.of.quota.943fc04');
      case 'unavailable':
        return translateLabel('loc.symphony.labels.unavailable.ca18449');
    }
  }

  // #endregion
}
