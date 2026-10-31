// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { TeamsFeedbackValidationIssue } from './TeamsFeedbackValidationIssue';

// #endregion

const LABELS: Readonly<Record<TeamsFeedbackValidationIssue, string>> = {
  'display-name': 'Display name',
  'tenant-id': 'Microsoft Entra tenant ID',
  'client-id': 'Application / client ID',
  'credential-ref': 'Client secret credential reference',
  'team-id': 'Team ID',
  'channel-id': 'Channel ID',
  'target-project': 'Target GitHub Project',
  'target-repository': 'Target GitHub repository',
};

/**
 * Names the missing details of the Microsoft Teams feedback intake sheet, for example
 * `Team ID · Channel ID`.
 *
 * @public
 */
@Pipe({ name: 'teamsFeedbackValidationIssuesLabel', standalone: true, pure: true })
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
