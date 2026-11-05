// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AzureDevOpsValidationIssue } from './AzureDevOpsValidationIssue';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const LABELS: Readonly<Record<AzureDevOpsValidationIssue, string>> = {
  get 'display-name'() {
    return translateLabel('loc.symphony.labels.display.name.2b7f6a8');
  },
  get organization() {
    return translateLabel('loc.symphony.labels.organization.d764d42');
  },
  get project() {
    return translateLabel('loc.symphony.labels.project.9859597');
  },
  get query() {
    return translateLabel('loc.symphony.labels.saved.query.id.or.wiql.6aaac61');
  },
};

/**
 * Names the missing details of the Azure DevOps source sheet, for example
 * `Organization · Project`.
 *
 * @public
 */
@Pipe({ name: 'azureDevOpsValidationIssuesLabel', standalone: true, pure: false })
export class AzureDevOpsValidationIssuesLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the missing details into their field labels.
   *
   * @param issues - The missing details in form order.
   * @public
   */
  public transform(issues: readonly AzureDevOpsValidationIssue[]): string {
    return issues.map((issue) => LABELS[issue]).join(' · ');
  }

  // #endregion
}
