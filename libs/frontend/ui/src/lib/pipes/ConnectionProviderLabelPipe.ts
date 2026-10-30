// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const labels: Readonly<Record<string, string>> = {
  'azure-devops': 'Azure DevOps',
  github: 'GitHub',
  codex: 'ChatGPT',
  claude: 'Claude',
  opencode: 'OpenCode',
};

@Pipe({ name: 'connectionProviderLabel', standalone: true, pure: true })
export class ConnectionProviderLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param provider - Provider.
   * @public
   */
  public transform(provider: string): string {
    return labels[provider] ?? provider;
  }

  // #endregion
}
