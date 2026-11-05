// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { TeamsFeedbackValidationIssue } from './TeamsFeedbackValidationIssue';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const LABELS: Readonly<Record<TeamsFeedbackValidationIssue, string>> = {
  get 'display-name'() {
    return translateLabel('loc.symphony.labels.display.name.2b7f6a8');
  },
  get 'tenant-id'() {
    return translateLabel('loc.symphony.labels.microsoft.entra.tenant.id.f7b29cc');
  },
  get 'client-id'() {
    return translateLabel('loc.symphony.labels.application.client.id.bb92f9c');
  },
  get 'credential-ref'() {
    return translateLabel('loc.symphony.labels.client.secret.credential.reference.9cb1596');
  },
  get 'team-id'() {
    return translateLabel('loc.symphony.labels.team.id.fa2758a');
  },
  get 'channel-id'() {
    return translateLabel('loc.symphony.labels.channel.id.8edd65c');
  },
  get 'target-project'() {
    return translateLabel('loc.symphony.labels.target.github.project.0cb23d1');
  },
  get 'target-repository'() {
    return translateLabel('loc.symphony.labels.target.github.repository.bdc4f37');
  },
};

/**
 * Names the missing details of the Microsoft Teams feedback intake sheet, for example
 * `Team ID · Channel ID`.
 *
 * @public
 */
@Pipe({ name: 'teamsFeedbackValidationIssuesLabel', standalone: true, pure: false })
export class TeamsFeedbackValidationIssuesLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the missing details into their field labels.
   *
   * @param issues - The missing details in form order.
   * @public
   */
  public transform(issues: readonly TeamsFeedbackValidationIssue[]): string {
    return issues.map((issue) => LABELS[issue]).join(' · ');
  }

  // #endregion
}
