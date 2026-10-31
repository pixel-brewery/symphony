// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IAgentActivityIcon {
  readonly icon: 'checkmarkCircle' | 'warning' | 'errorCircle' | 'pause' | 'executionOutline';
  readonly variant: 'success' | 'warning' | 'danger' | 'neutral';
  readonly label: string;
}

/**
 * Maps an agent's state to the status icon drawn at the end of its row, with the label the icon
 * stands for. Working agents show a running indicator instead.
 *
 * @public
 */
@Pipe({ name: 'agentActivityIcon', standalone: true, pure: true })
export class AgentActivityIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms an activity state into its icon.
   *
   * @param state - The agent's activity state.
   * @returns The registered icon name, its variant and its accessible label.
   * @public
   */
  public transform(state: string): IAgentActivityIcon {
    switch (state) {
      case 'completed':
        return { icon: 'checkmarkCircle', variant: 'success', label: 'Finished' };
      case 'needs-input':
        return { icon: 'warning', variant: 'warning', label: 'Waiting for you' };
      case 'blocked':
        return { icon: 'warning', variant: 'warning', label: 'Blocked' };
      case 'failed':
        return { icon: 'errorCircle', variant: 'danger', label: 'Failed' };
      case 'paused':
        return { icon: 'pause', variant: 'neutral', label: 'Paused' };
      default:
        return { icon: 'executionOutline', variant: 'neutral', label: 'Queued' };
    }
  }

  // #endregion
}
