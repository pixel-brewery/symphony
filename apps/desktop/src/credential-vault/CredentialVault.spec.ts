// #region Imports

import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CredentialVault, type ICredentialCipher } from './';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('CredentialVault', () => {
  it('persists an encrypted blob and returns the decrypted credential', () => {
    // arrange
    const root = temporaryRoot();
    const vault = new CredentialVault(root, reversibleCipher());
    const reference = 'vault:azure-devops:ado-serviceware';

    // act
    vault.save(reference, 'secret-pat-value');

    // assert
    expect(vault.references()).toEqual([reference]);
    expect(vault.read(reference)).toBe('secret-pat-value');
    const credentialPath = join(
      root,
      'credentials',
      'azure-devops',
      `${Buffer.from(reference).toString('base64url')}.credential`,
    );
    const persisted = readFileSync(credentialPath, 'utf8');
    expect(persisted).not.toContain('secret-pat-value');
    if (process.platform !== 'win32') {
      expect(statSync(credentialPath).mode & 0o777).toBe(0o600);
      expect(statSync(join(root, 'credentials', 'azure-devops')).mode & 0o777).toBe(0o700);
    }
  });

  it('removes credentials which are no longer referenced by settings', () => {
    // arrange
    const vault = new CredentialVault(temporaryRoot(), reversibleCipher());
    vault.save('vault:azure-devops:retained', 'one');
    vault.save('vault:azure-devops:removed', 'two');

    // act
    vault.prune(new Set(['vault:azure-devops:retained']));

    // assert
    expect(vault.references()).toEqual(['vault:azure-devops:retained']);
    expect(vault.read('vault:azure-devops:retained')).toBe('one');
  });

  it('lists encrypted references without accessing the operating-system cipher', () => {
    // arrange
    const root = temporaryRoot();
    const vault = new CredentialVault(root, reversibleCipher());
    const reference = 'vault:azure-devops:ado-serviceware';
    vault.save(reference, 'secret');
    const metadataOnlyVault = new CredentialVault(root, {
      get available(): boolean {
        throw new Error('The cipher must stay untouched.');
      },
      encrypt: () => {
        throw new Error('The cipher must stay untouched.');
      },
      decrypt: () => {
        throw new Error('The cipher must stay untouched.');
      },
    });

    // act
    const references = metadataOnlyVault.references();

    // assert
    expect(references).toEqual([reference]);
  });

  it('fails closed when operating-system encryption is unavailable', () => {
    // arrange
    const vault = new CredentialVault(temporaryRoot(), { ...reversibleCipher(), available: false });

    // act / assert
    expect(() => vault.save('vault:azure-devops:ado-serviceware', 'secret')).toThrow(
      /Secure credential storage is unavailable/u,
    );
  });
});

function temporaryRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), 'symphony-credential-vault-'));
  temporaryDirectories.push(directory);
  return directory;
}

function reversibleCipher(): ICredentialCipher {
  return {
    available: true,
    encrypt: (value) => Buffer.from([...value].reverse().join(''), 'utf8'),
    decrypt: (value) => [...value.toString('utf8')].reverse().join(''),
  };
}
