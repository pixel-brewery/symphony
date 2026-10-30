// #region Imports

import type { IApplicationSettings, ProviderConnection } from '@symphony/configuration-composition';
import type { IAzureDevOpsCredential } from '@symphony/providers-azure-devops';
// #endregion

type AzureDevOpsConnection = Extract<ProviderConnection, { readonly kind: 'azure-devops' }>;

/** Keeps decrypted vault credentials in Utility-Process memory and resolves legacy env references. */
export class AzureDevOpsCredentialBroker {
  // #region Fields

  private readonly _vaultCredentials = new Map<string, string>();
  private readonly _availableVaultCredentials = new Set<string>();
  private readonly _pendingVaultCredentials = new Map<string, Promise<string | undefined>>();

  // #endregion

  // #region Ctor

  /**
   * Creates the in-memory broker with the process environment used by legacy references.
   *
   * @param _environment - Utility-Process environment.
   * @param _resolveVaultCredential - Correlated Main-process resolver for one vault reference.
   * @public
   */
  public constructor(
    private readonly _environment: NodeJS.ProcessEnv,
    private readonly _resolveVaultCredential: (
      reference: string,
    ) => Promise<string | undefined> = async () => undefined,
  ) {}

  // #endregion

  // #region Methods

  /**
   * Creates the vault reference owned by one Azure DevOps connection.
   *
   * @param connectionId - Stable connection identifier.
   * @returns Non-secret vault reference.
   * @public
   */
  public reference(connectionId: string): string {
    if (!/^[A-Za-z0-9._-]+$/u.test(connectionId)) {
      throw new Error('Invalid Azure DevOps connection ID.');
    }
    return `vault:azure-devops:${connectionId}`;
  }

  /**
   * Synchronizes which encrypted blobs exist without loading their secret values.
   *
   * @param references - Validated connection-bound credential references.
   * @public
   */
  public synchronizeAvailableReferences(references: readonly string[]): void {
    this._availableVaultCredentials.clear();
    for (const reference of references) {
      if (/^vault:azure-devops:[A-Za-z0-9._-]+$/u.test(reference)) {
        this._availableVaultCredentials.add(reference);
      }
    }
    for (const reference of this._vaultCredentials.keys()) {
      if (!this._availableVaultCredentials.has(reference)) this._vaultCredentials.delete(reference);
    }
  }

  /**
   * Stores one credential after a successful connection flow.
   *
   * @param reference - Non-secret credential reference.
   * @param secret - Decrypted credential held only in memory.
   * @public
   */
  public set(reference: string, secret: string): void {
    this._availableVaultCredentials.add(reference);
    this._vaultCredentials.set(reference, secret);
  }

  /**
   * Removes one in-memory credential.
   *
   * @param reference - Non-secret credential reference.
   * @public
   */
  public remove(reference: string): void {
    this._availableVaultCredentials.delete(reference);
    this._vaultCredentials.delete(reference);
  }

  /**
   * Resolves a connection credential without exposing it outside the provider boundary.
   *
   * @param connection - Azure DevOps provider connection.
   * @returns Provider credential when its reference can be resolved.
   * @public
   */
  public async resolve(
    connection: AzureDevOpsConnection,
  ): Promise<IAzureDevOpsCredential | undefined> {
    const reference = connection.credentialRef;
    if (!reference) return undefined;
    if (reference.startsWith('vault:azure-devops:')) {
      if (reference !== this.reference(connection.id)) return undefined;
      const cached = this._vaultCredentials.get(reference);
      if (cached) return { scheme: 'Basic', token: cached };
      if (!this._availableVaultCredentials.has(reference)) return undefined;
      const pending =
        this._pendingVaultCredentials.get(reference) ?? this.loadVaultCredential(reference);
      const token = await pending;
      return token ? { scheme: 'Basic', token } : undefined;
    }
    const [kind, environmentName] = reference.split(':', 2);
    if (!environmentName || (kind !== 'env' && kind !== 'entra-env')) return undefined;
    const token = this._environment[environmentName];
    return token ? { scheme: kind === 'entra-env' ? 'Bearer' : 'Basic', token } : undefined;
  }

  /**
   * Projects secret-safe Azure DevOps authentication status for renderer synchronization.
   *
   * @param settings - Current application settings.
   * @returns Authentication status without credential values or references.
   * @public
   */
  public status(settings: IApplicationSettings) {
    return {
      accounts: settings.connections.flatMap((connection) => {
        if (connection.kind !== 'azure-devops') return [];
        const reference = connection.credentialRef;
        const authenticated = reference?.startsWith('vault:azure-devops:')
          ? reference === this.reference(connection.id) &&
            this._availableVaultCredentials.has(reference)
          : Boolean(
              reference &&
              this._environment[reference.split(':', 2)[1] ?? ''] &&
              (reference.startsWith('env:') || reference.startsWith('entra-env:')),
            );
        return [
          {
            id: connection.id,
            displayName: connection.displayName,
            organization: connection.organization,
            authenticated,
            ...(authenticated
              ? {
                  method: reference?.startsWith('entra-env:')
                    ? ('entra' as const)
                    : reference?.startsWith('env:')
                      ? ('environment' as const)
                      : ('pat' as const),
                }
              : {}),
          },
        ];
      }),
    };
  }

  private loadVaultCredential(reference: string): Promise<string | undefined> {
    const pending = this._resolveVaultCredential(reference)
      .then((token) => {
        if (token) this._vaultCredentials.set(reference, token);
        return token;
      })
      .finally(() => this._pendingVaultCredentials.delete(reference));
    this._pendingVaultCredentials.set(reference, pending);
    return pending;
  }

  // #endregion
}
