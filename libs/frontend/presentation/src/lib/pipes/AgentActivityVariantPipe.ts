// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Maps an agent's state to its status dot: working is informative, waiting for a person or blocked
 * asks for attention, a failure is dangerous, everything else is quiet.
 *
 * @public
 */
@Pipe({ name: 'agentActivityVariant', standalone: true, pure: true })
export class AgentActivityVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Selects the dot variant.
   *
   * @param state - Projected agent state.
   * @returns The Mosaik variant.
   * @public
   */
  public transform(state: string): 'info' | 'warning' | 'danger' | 'neutral' {
    switch (state) {
      case 'working':
        return 'info';
      case 'needs-input':
      case 'blocked':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  // #endregion
}
