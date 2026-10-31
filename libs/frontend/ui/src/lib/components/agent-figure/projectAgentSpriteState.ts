// #region Imports

import type { IAgentActivity, IAgentWork } from '@symphony/domain-team';
import type { AgentSpriteState } from './AgentSpriteState';

// #endregion

/** Projects poses from evidence; a pointer gesture never changes the domain status. @public */
export function projectAgentSpriteState(
  state: IAgentActivity['state'],
  work: readonly IAgentWork[],
  activeRole?: string,
): AgentSpriteState {
  switch (state) {
    case 'working': {
      const role = activeRole ?? work.find((item) => item.state === 'working')?.role;
      return role && /analys|analyz|review|verif|test|inspect|diagnos/iu.test(role)
        ? 'review'
        : 'running';
    }
    case 'needs-input':
    case 'queued':
      return 'waiting';
    case 'completed':
      return 'jumping';
    case 'failed':
    case 'blocked':
      return 'failed';
    case 'idle':
    case 'paused':
    case 'stale':
      return 'idle';
  }
}
