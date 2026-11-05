// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

interface IUsageAccount {
  readonly login: string;
  readonly planName?: string;
}

@Pipe({ name: 'githubActionsAccountLabel', standalone: true, pure: false })
export class GithubActionsAccountLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param account - Account.
   * @public
   */
  public transform(account: IUsageAccount | undefined): string {
    if (!account)
      return translateLabel(
        'loc.symphony.labels.monthly.hosted.runner.allowance.for.this.repository..d1183b1',
      );
    const normalizedPlan = account.planName?.replaceAll('_', ' ').replaceAll('-', ' ').trim();
    const plan = normalizedPlan
      ? ` · ${normalizedPlan[0]?.toUpperCase()}${normalizedPlan.slice(1)} plan`
      : '';
    return `@${account.login}${plan}`;
  }

  // #endregion
}
