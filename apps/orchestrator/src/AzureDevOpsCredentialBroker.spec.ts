// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { createDefaultApplicationSettings } from '@symphony/configuration-composition';
import { AzureDevOpsCredentialBroker } from './AzureDevOpsCredentialBroker';

// #endregion

describe('AzureDevOpsCredentialBroker', () => {
  it('requests one vault PAT only when its bound connection needs it', async () => {
    // arrange
    const resolveVaultCredential = vi.fn(async () => 'stored-pat');
    const broker = new AzureDevOpsCredentialBroker({}, resolveVaultCredential);
    const connection = azureConnection('vault:azure-devops:ado-serviceware');
    broker.synchronizeAvailableReferences(['vault:azure-devops:ado-serviceware']);
    expect(resolveVaultCredential).not.toHaveBeenCalled();

    // act
    const credential = await broker.resolve(connection);

    // assert
    expect(credential).toEqual({ scheme: 'Basic', token: 'stored-pat' });
    expect(resolveVaultCredential).toHaveBeenCalledOnce();
    expect(resolveVaultCredential).toHaveBeenCalledWith('vault:azure-devops:ado-serviceware');
  });

  it('keeps environment PAT and Entra references as migration-compatible fallbacks', async () => {
    // arrange
    const broker = new AzureDevOpsCredentialBroker({ ADO_PAT: 'pat', ADO_ENTRA: 'access-token' });

    // act / assert
    await expect(broker.resolve(azureConnection('env:ADO_PAT'))).resolves.toEqual({
      scheme: 'Basic',
      token: 'pat',
    });
    await expect(broker.resolve(azureConnection('entra-env:ADO_ENTRA'))).resolves.toEqual({
      scheme: 'Bearer',
      token: 'access-token',
    });
  });

  it('does not let one connection reuse another connection vault reference', async () => {
    // arrange
    const broker = new AzureDevOpsCredentialBroker({});
    broker.set('vault:azure-devops:other-connection', 'other-secret');

    // act / assert
    await expect(
      broker.resolve({
        ...azureConnection('vault:azure-devops:other-connection'),
        id: 'ado-serviceware',
      }),
    ).resolves.toBeUndefined();
  });

  it('reports authentication without exposing the credential', () => {
    // arrange
    const broker = new AzureDevOpsCredentialBroker({});
    broker.set('vault:azure-devops:ado-serviceware', 'stored-pat');
    const settings = createDefaultApplicationSettings('/tmp');

    // act
    const status = broker.status({
      ...settings,
      connections: [azureConnection('vault:azure-devops:ado-serviceware')],
    });

    // assert
    expect(status).toEqual({
      accounts: [
        {
          id: 'ado-serviceware',
          displayName: 'Platform Engine',
          organization: 'serviceware-se',
          authenticated: true,
          method: 'pat',
        },
      ],
    });
    expect(JSON.stringify(status)).not.toContain('stored-pat');
  });
});

function azureConnection(credentialRef: string) {
  return {
    id: 'ado-serviceware',
    workspaceId: 'serviceware',
    kind: 'azure-devops' as const,
    displayName: 'Platform Engine',
    organization: 'serviceware-se',
    credentialRef,
  };
}
