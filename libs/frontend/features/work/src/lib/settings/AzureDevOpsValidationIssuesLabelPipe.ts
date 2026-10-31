// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { AzureDevOpsValidationIssue } from './AzureDevOpsValidationIssue';

// #endregion

const LABELS: Readonly<Record<AzureDevOpsValidationIssue, string>> = {
  'display-name': 'Display name',
  organization: 'Organization',
  project: 'Project',
  query: 'Saved query ID or WIQL',
};

/**
 * Names the missing details of the Azure DevOps source sheet, for example
 * `Organization · Project`.
 *
 * @public
 */
@Pipe({ name: 'azureDevOpsValidationIssuesLabel', standalone: true, pure: true })
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
