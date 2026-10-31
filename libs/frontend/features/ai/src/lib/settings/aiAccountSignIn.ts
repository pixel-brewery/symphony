// #region Imports

import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';

// #endregion

/**
 * The sign-in state of a Codex or Claude Code account as Connected services shows it; OpenCode
 * accounts use imported provider sign-ins and have none.
 *
 * @param account - The configured AI account.
 * @param connections - The last read provider sign-in state, if any.
 * @returns `CLI not installed`, `Sign-in not checked yet`, `Signed in` or `Not signed in`.
 * @public
 */
export function aiAccountSignIn(
  account: ApplicationSettingsDto['connections'][number],
  connections: ResponsePayload<'connections.get'> | undefined,
): string | undefined {
  if (account.kind !== 'codex' && account.kind !== 'claude') return undefined;
  const provider = account.kind === 'codex' ? connections?.codex : connections?.claude;
  const status = provider?.accounts.find((candidate) => candidate.id === account.id);
  return !provider?.cliAvailable
    ? 'CLI not installed'
    : !status
      ? 'Sign-in not checked yet'
      : status.authenticated
        ? 'Signed in'
        : 'Not signed in';
}
