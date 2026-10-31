// #region Imports

import type { IApplicationSettings } from '../IApplicationSettings';
import type { ProviderConnection } from '../ProviderConnection';

// #endregion

export function connectionFor<TKind extends ProviderConnection['kind']>(
  settings: IApplicationSettings,
  connectionId: string,
  kind: TKind,
): Extract<ProviderConnection, { kind: TKind }> | undefined {
  const connection = settings.connections.find((candidate) => candidate.id === connectionId);
  return connection?.kind === kind
    ? (connection as Extract<ProviderConnection, { kind: TKind }>)
    : undefined;
}
