// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AgentAvailability } from '../models/AgentAvailability';

// #endregion

/**
 * Maps an agent's availability to the variant of its status dot.
 *
 * @public
 */
@Pipe({ name: 'agentAvailabilityVariant', standalone: true, pure: true })
export class AgentAvailabilityVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the availability into a Mosaik variant.
   *
   * @param availability - Availability of the agent.
   * @public
   */
  public transform(availability: AgentAvailability): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (availability) {
      case 'available':
        return 'success';
      case 'backup-in-use':
        return 'warning';
      case 'out-of-quota':
        return 'danger';
      case 'unavailable':
        return 'neutral';
    }
  }

  // #endregion
}
