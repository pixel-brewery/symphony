// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

interface IProviderAccount {
  readonly id: string;
  readonly authenticated: boolean;
  readonly error?: string;
  readonly method?: string;
}

interface IProviderConnections {
  readonly codex: {
    readonly cliAvailable: boolean;
    readonly accounts: readonly IProviderAccount[];
  };
  readonly claude: {
    readonly cliAvailable: boolean;
    readonly accounts: readonly IProviderAccount[];
  };
}

@Pipe({ name: 'aiAccountStatus', standalone: true, pure: true })
export class AiAccountStatusPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param accountId - Account id.
   * @param kind - Kind.
   * @param connections - Connections.
   * @public
   */
  public transform(
    accountId: string | undefined,
    kind: string,
    connections: IProviderConnections | undefined,
  ): string {
    if (kind === 'opencode') return 'Uses imported OpenCode provider sign-ins';
    if (!accountId) return 'Not connected yet';
    const provider = kind === 'codex' ? connections?.codex : connections?.claude;
    if (!provider?.cliAvailable) {
      return `${kind === 'codex' ? 'Codex' : 'Claude Code'} CLI is not installed.`;
    }
    const account = provider.accounts.find((candidate) => candidate.id === accountId);
    if (!account) return 'Sign-in status has not been checked yet.';
    if (!account.authenticated)
      return account.error ? 'Sign-in status unavailable.' : 'Not signed in';
    const method =
      account.method === 'api-key'
        ? 'API key'
        : account.method === 'chatgpt'
          ? 'ChatGPT subscription'
          : account.method === 'subscription'
            ? 'Claude subscription'
            : 'Provider account';
    return `Signed in with ${method}`;
  }

  // #endregion
}
