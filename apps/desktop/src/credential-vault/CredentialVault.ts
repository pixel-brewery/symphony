// #region Imports

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { ICredentialCipher } from './ICredentialCipher';

// #endregion

const CREDENTIAL_FILE_SUFFIX = '.credential';

/**
 * Stores only operating-system-encrypted credential blobs in Symphony's private data directory.
 * The reference is non-secret and is the only value persisted in application settings.
 */
export class CredentialVault {
  // #region Fields

  private readonly _directory: string;

  // #endregion

  // #region Ctor

  /**
   * Creates the credential vault below the application configuration root.
   *
   * @param configurationRoot - Private application configuration directory.
   * @param _cipher - Operating-system credential cipher.
   * @public
   */
  public constructor(
    configurationRoot: string,
    private readonly _cipher: ICredentialCipher,
  ) {
    this._directory = join(configurationRoot, 'credentials', 'azure-devops');
  }

  // #endregion

  // #region Methods

  /**
   * Encrypts and persists one Azure DevOps credential.
   *
   * @param reference - Non-secret credential reference.
   * @param secret - Personal access token to encrypt.
   * @public
   */
  public save(reference: string, secret: string): void {
    this.assertAvailable();
    if (!secret.trim()) throw new Error('The Azure DevOps personal access token is empty.');
    mkdirSync(this._directory, { recursive: true, mode: 0o700 });
    chmodSync(this._directory, 0o700);
    const path = this.path(reference);
    writeFileSync(path, this._cipher.encrypt(secret), { mode: 0o600 });
    chmodSync(path, 0o600);
  }

  /**
   * Removes one encrypted credential blob.
   *
   * @param reference - Non-secret credential reference.
   * @public
   */
  public remove(reference: string): void {
    rmSync(this.path(reference), { force: true });
  }

  /**
   * Lists opaque credential references without accessing the operating-system secret store.
   *
   * @returns Valid references backed by encrypted blobs.
   * @public
   */
  public references(): readonly string[] {
    if (!existsSync(this._directory)) return [];
    return readdirSync(this._directory, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isFile() || !entry.name.endsWith(CREDENTIAL_FILE_SUFFIX)) return [];
      try {
        return [decodeReference(entry.name.slice(0, -CREDENTIAL_FILE_SUFFIX.length))];
      } catch {
        return [];
      }
    });
  }

  /**
   * Decrypts one explicitly addressed credential.
   *
   * @param reference - Connection-bound credential reference.
   * @returns The decrypted secret, or `undefined` when no encrypted blob exists.
   * @public
   */
  public read(reference: string): string | undefined {
    const path = this.path(reference);
    if (!existsSync(path)) return undefined;
    this.assertAvailable();
    return this._cipher.decrypt(readFileSync(path));
  }

  /**
   * Removes credential blobs that are no longer referenced by application settings.
   *
   * @param retainedReferences - Credential references that remain in use.
   * @public
   */
  public prune(retainedReferences: ReadonlySet<string>): void {
    if (!existsSync(this._directory)) return;
    for (const entry of readdirSync(this._directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(CREDENTIAL_FILE_SUFFIX)) continue;
      try {
        const reference = decodeReference(entry.name.slice(0, -CREDENTIAL_FILE_SUFFIX.length));
        if (!retainedReferences.has(reference)) this.remove(reference);
      } catch {
        // Unknown files are not credential entries owned by this vault.
      }
    }
  }

  private assertAvailable(): void {
    if (!this._cipher.available) {
      throw new Error(
        'Secure credential storage is unavailable on this computer. Configure the operating-system keychain before connecting Azure DevOps.',
      );
    }
  }

  private path(reference: string): string {
    if (!/^vault:azure-devops:[A-Za-z0-9._-]+$/u.test(reference)) {
      throw new Error('Invalid Azure DevOps credential reference.');
    }
    return join(
      this._directory,
      `${Buffer.from(reference, 'utf8').toString('base64url')}${CREDENTIAL_FILE_SUFFIX}`,
    );
  }

  // #endregion
}

function decodeReference(encoded: string): string {
  const reference = Buffer.from(encoded, 'base64url').toString('utf8');
  if (!/^vault:azure-devops:[A-Za-z0-9._-]+$/u.test(reference)) {
    throw new Error('Invalid Azure DevOps credential reference.');
  }
  return reference;
}
