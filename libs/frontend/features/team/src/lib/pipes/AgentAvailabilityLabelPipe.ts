// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AgentAvailability } from '../models/AgentAvailability';

// #endregion

/**
 * Labels an agent's availability on its card.
 *
 * @public
 */
@Pipe({ name: 'agentAvailabilityLabel', standalone: true, pure: true })
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
        return 'Available';
      case 'backup-in-use':
        return 'Backup in use · preferred account out of quota';
      case 'out-of-quota':
        return 'Out of quota';
      case 'unavailable':
        return 'Unavailable';
    }
  }

  // #endregion
}
