// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const ROLE_VERBS: Readonly<Record<string, string>> = {
  'work-item-creation': 'Drafting',
  analysis: 'Analyzing',
  solution: 'Implementing',
  revision: 'Revising',
  'ci-diagnosis': 'Diagnosing',
  'ci-repair': 'Repairing',
  'pull-request-review': 'Addressing reviews on',
};

/**
 * Names what an agent is doing, as the run panel's activity line reads it: `Implementing`,
 * `Waiting for you on`, `Paused on`, `Idle`.
 *
 * @public
 */
@Pipe({ name: 'agentActivityLabel', standalone: true, pure: true })
export class AgentActivityLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Formats the activity verb.
   *
   * @param state - Projected agent state.
   * @param role - Skill-flow role or execution kind of the current work.
   * @returns The leading words of the activity line.
   * @public
   */
  public transform(state: string, role?: string): string {
    switch (state) {
      case 'working':
        return ROLE_VERBS[role ?? ''] ?? 'Working on';
      case 'queued':
        return 'Queued for';
      case 'needs-input':
        return 'Waiting for you on';
      case 'paused':
        return 'Paused on';
      case 'blocked':
        return 'Blocked on';
      case 'failed':
        return 'Failed on';
      case 'completed':
        return 'Finished';
      default:
        return 'Idle';
    }
  }

  // #endregion
}
