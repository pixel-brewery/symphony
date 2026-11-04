// #region Imports

import { Pipe, PipeTransform } from '@angular/core';
import type { IAgentActivity } from '@symphony/domain-team';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ pure: false, name: 'agentStateLabel', standalone: true })
export class AgentStateLabelPipe implements PipeTransform {
  // #region Methods

  /** @public */
  public transform(state: IAgentActivity['state']): string {
    switch (state) {
      case 'idle':
        return translateLabel('loc.symphony.labels.available.e674447');
      case 'queued':
        return translateLabel('loc.symphony.labels.in.queue.03872dc');
      case 'working':
        return translateLabel('loc.symphony.labels.working.a92f044');
      case 'needs-input':
        return translateLabel('loc.symphony.labels.needs.your.response.e89df18');
      case 'paused':
        return translateLabel('loc.symphony.labels.paused.e159b06');
      case 'blocked':
        return translateLabel('loc.symphony.labels.blocked.18f2a09');
      case 'completed':
        return translateLabel('loc.symphony.labels.completed.22a970d');
      case 'failed':
        return translateLabel('loc.symphony.labels.failed.031a8f0');
      case 'stale':
        return translateLabel('loc.symphony.labels.last.known.state.7cca6fd');
    }
  }

  // #endregion
}
