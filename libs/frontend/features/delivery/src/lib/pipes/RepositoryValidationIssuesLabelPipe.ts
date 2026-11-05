// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { RepositoryValidationIssue } from '../settings/RepositoryValidationIssue';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const LABELS: Readonly<Record<RepositoryValidationIssue, string>> = {
  get 'display-name'() {
    return translateLabel('loc.symphony.labels.display.name.2b7f6a8');
  },
  get owner() {
    return translateLabel('loc.symphony.labels.owner.4b1b8aa');
  },
  get name() {
    return translateLabel('loc.symphony.labels.repository.13d6ff0');
  },
};

/**
 * Names the missing details of the repository sheet, for example `Owner · Repository`.
 *
 * @public
 */
@Pipe({ name: 'repositoryValidationIssuesLabel', standalone: true, pure: false })
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
