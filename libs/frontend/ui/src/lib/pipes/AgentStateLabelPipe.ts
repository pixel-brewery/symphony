// #region Imports

import { Pipe, PipeTransform } from '@angular/core';
import type { IAgentActivity } from '@symphony/domain-team';

// #endregion

@Pipe({ name: 'agentStateLabel', standalone: true })
export class AgentStateLabelPipe implements PipeTransform {
  // #region Methods

  /** @public */
  public transform(state: IAgentActivity['state']): string {
    switch (state) {
      case 'idle':
        return 'Available';
      case 'queued':
        return 'In queue';
      case 'working':
        return 'Working';
      case 'needs-input':
        return 'Needs your response';
      case 'paused':
        return 'Paused';
      case 'blocked':
        return 'Blocked';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'stale':
        return 'Last known state';
    }
  }

  // #endregion
}
