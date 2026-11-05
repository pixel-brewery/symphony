// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
@Pipe({ name: 'agentActivityLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.queued.for.b1189be');
      case 'needs-input':
        return translateLabel('loc.symphony.labels.waiting.for.you.on.b5ac5fb');
      case 'paused':
        return translateLabel('loc.symphony.labels.paused.on.baa57b1');
      case 'blocked':
        return translateLabel('loc.symphony.labels.blocked.on.40b4ec8');
      case 'failed':
        return translateLabel('loc.symphony.labels.failed.on.bbd3765');
      case 'completed':
        return translateLabel('loc.symphony.labels.finished.7804f7a');
      default:
        return translateLabel('loc.symphony.labels.idle.ab0171c');
    }
  }

  // #endregion
}
