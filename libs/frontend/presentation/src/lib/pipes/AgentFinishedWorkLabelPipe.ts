// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const ROLE_PAST_VERBS: Readonly<Record<string, Parameters<typeof translateLabel>[0]>> = {
  'work-item-creation': 'loc.symphony.labels.finishedWork.drafted',
  analysis: 'loc.symphony.labels.finishedWork.planned',
  solution: 'loc.symphony.labels.finishedWork.implemented',
  revision: 'loc.symphony.labels.finishedWork.revised',
  'ci-diagnosis': 'loc.symphony.labels.finishedWork.diagnosed',
  'ci-repair': 'loc.symphony.labels.finishedWork.repaired',
  'pull-request-review': 'loc.symphony.labels.finishedWork.addressedReviewsOn',
};

/**
 * Names what an agent finished last, in the past tense: `planned`, `implemented`.
 *
 * @public
 */
@Pipe({ name: 'agentFinishedWorkLabel', standalone: true, pure: false })
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
    return translateLabel(
      ROLE_PAST_VERBS[role ?? ''] ?? 'loc.symphony.labels.finishedWork.workedOn',
    );
  }

  // #endregion
}
