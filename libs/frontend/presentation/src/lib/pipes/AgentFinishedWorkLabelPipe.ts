// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const ROLE_PAST_VERBS: Readonly<Record<string, string>> = {
  'work-item-creation': 'drafted',
  analysis: 'planned',
  solution: 'implemented',
  revision: 'revised',
  'ci-diagnosis': 'diagnosed',
  'ci-repair': 'repaired',
  'pull-request-review': 'addressed reviews on',
};

/**
 * Names what an agent finished last, in the past tense: `planned`, `implemented`.
 *
 * @public
 */
@Pipe({ name: 'agentFinishedWorkLabel', standalone: true, pure: true })
export class AgentFinishedWorkLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a delivery-flow role into the past-tense verb of its finished work.
   *
   * @param role - Role of the finished work, for example `analysis`.
   * @returns The verb, for example `planned`; `worked on` for an unknown role.
   * @public
   */
  public transform(role: string | undefined): string {
    return ROLE_PAST_VERBS[role ?? ''] ?? 'worked on';
  }

  // #endregion
}
