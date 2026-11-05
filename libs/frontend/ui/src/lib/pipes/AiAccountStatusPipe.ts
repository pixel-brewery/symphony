// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

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

@Pipe({ name: 'aiAccountStatus', standalone: true, pure: false })
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
    if (kind === 'opencode')
      return translateLabel('loc.symphony.labels.uses.imported.opencode.provider.sign.ins.0b0b8b2');
    if (!accountId) return translateLabel('loc.symphony.labels.not.connected.yet.8985693');
    const provider = kind === 'codex' ? connections?.codex : connections?.claude;
    if (!provider?.cliAvailable) {
      return translateLabel(
        'loc.symphony.labels.cli.is.not.installed.0325bac',
        kind === 'codex' ? 'Codex' : 'Claude Code',
      );
    }
    const account = provider.accounts.find((candidate) => candidate.id === accountId);
    if (!account)
      return translateLabel('loc.symphony.labels.sign.in.status.has.not.been.checked.yet.6028547');
    if (!account.authenticated)
      return account.error
        ? translateLabel('loc.symphony.labels.sign.in.status.unavailable.05b97be')
        : translateLabel('loc.symphony.labels.not.signed.in.491fc91');
    const method =
      account.method === 'api-key'
        ? 'API key'
        : account.method === 'chatgpt'
          ? 'ChatGPT subscription'
          : account.method === 'subscription'
            ? 'Claude subscription'
            : 'Provider account';
    return translateLabel('loc.symphony.labels.signed.in.with.a35de47', method);
  }

  // #endregion
}
