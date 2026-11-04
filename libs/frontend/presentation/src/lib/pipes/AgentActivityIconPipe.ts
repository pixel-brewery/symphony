// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
@Pipe({ name: 'agentActivityIcon', standalone: true, pure: false })
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
        return {
          icon: 'checkmarkCircle',
          variant: 'success',
          get label() {
            return translateLabel('loc.symphony.labels.finished.7804f7a');
          },
        };
      case 'needs-input':
        return {
          icon: 'warning',
          variant: 'warning',
          get label() {
            return translateLabel('loc.symphony.labels.waiting.for.you.9f760ab');
          },
        };
      case 'blocked':
        return {
          icon: 'warning',
          variant: 'warning',
          get label() {
            return translateLabel('loc.symphony.labels.blocked.18f2a09');
          },
        };
      case 'failed':
        return {
          icon: 'errorCircle',
          variant: 'danger',
          get label() {
            return translateLabel('loc.symphony.labels.failed.031a8f0');
          },
        };
      case 'paused':
        return {
          icon: 'pause',
          variant: 'neutral',
          get label() {
            return translateLabel('loc.symphony.labels.paused.e159b06');
          },
        };
      default:
        return {
          icon: 'executionOutline',
          variant: 'neutral',
          get label() {
            return translateLabel('loc.symphony.labels.queued.661ff40');
          },
        };
    }
  }

  // #endregion
}
