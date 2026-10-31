// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IUsageAccount {
  readonly login: string;
  readonly planName?: string;
}

@Pipe({ name: 'githubActionsAccountLabel', standalone: true, pure: true })
export class GithubActionsAccountLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param account - Account.
   * @public
   */
  public transform(account: IUsageAccount | undefined): string {
    if (!account) return 'Monthly hosted-runner allowance for this repository owner.';
    const normalizedPlan = account.planName?.replaceAll('_', ' ').replaceAll('-', ' ').trim();
    const plan = normalizedPlan
      ? ` · ${normalizedPlan[0]?.toUpperCase()}${normalizedPlan.slice(1)} plan`
      : '';
    return `@${account.login}${plan}`;
  }

  // #endregion
}
