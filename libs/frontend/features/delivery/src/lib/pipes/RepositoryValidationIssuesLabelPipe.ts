// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { RepositoryValidationIssue } from '../settings/RepositoryValidationIssue';

// #endregion

const LABELS: Readonly<Record<RepositoryValidationIssue, string>> = {
  'display-name': 'Display name',
  owner: 'Owner',
  name: 'Repository',
};

/**
 * Names the missing details of the repository sheet, for example `Owner · Repository`.
 *
 * @public
 */
@Pipe({ name: 'repositoryValidationIssuesLabel', standalone: true, pure: true })
export class RepositoryValidationIssuesLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the missing details into their field labels.
   *
   * @param issues - The missing details in form order.
   * @public
   */
  public transform(issues: readonly RepositoryValidationIssue[]): string {
    return issues.map((issue) => LABELS[issue]).join(' · ');
  }

  // #endregion
}
