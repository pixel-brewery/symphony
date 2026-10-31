// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { internalCredentialMessageSchema } from '@symphony/ipc-contracts-core';
import { createCredentialBridge } from './createCredentialBridge';
// #endregion

afterEach(() => {
  vi.useRealTimers();
});

describe('createCredentialBridge', () => {
  it('correlates the credential reference and never sends the resolved secret back through the port', async () => {
    // arrange
    const posted: unknown[] = [];
    const bridge = createCredentialBridge({
      parentPort: {
        on: () => undefined,
        postMessage: (message) => {
          posted.push(message);
        },
      },
      azureDevOpsCredentials: { synchronizeAvailableReferences: () => undefined },
      startInitializedBackgroundServices: () => undefined,
    });
    const pending = bridge.requestVaultCredential('vault:azure-devops:account');
    const request = internalCredentialMessageSchema.parse(posted[0]);
    if (request.type !== 'credentials.resolve.request')
      throw new Error('Credential request missing');
    // act
    bridge.handleInternalCredentialMessage({
      type: 'credentials.resolve.response',
      requestId: request.requestId,
      reference: request.reference,
      result: { status: 'resolved', secret: 'secret-value' },
    });
    // assert
    await expect(pending).resolves.toBe('secret-value');
    expect(posted).toHaveLength(1);
    expect(JSON.stringify(posted)).not.toContain('secret-value');
  });

  it('rejects a mismatched reference and bounds an unanswered request to the existing timeout', async () => {
    // arrange
    vi.useFakeTimers();
    const posted: unknown[] = [];
    const bridge = createCredentialBridge({
      parentPort: {
        on: () => undefined,
        postMessage: (message) => {
          posted.push(message);
        },
      },
      azureDevOpsCredentials: { synchronizeAvailableReferences: () => undefined },
      startInitializedBackgroundServices: () => undefined,
    });
    const mismatched = bridge.requestVaultCredential('vault:azure-devops:first');
    const rejected = expect(mismatched).rejects.toThrow('did not match');
    const request = internalCredentialMessageSchema.parse(posted[0]);
    if (request.type !== 'credentials.resolve.request')
      throw new Error('Credential request missing');
    // act
    bridge.handleInternalCredentialMessage({
      type: 'credentials.resolve.response',
      requestId: request.requestId,
      reference: 'vault:azure-devops:other',
      result: { status: 'missing' },
    });
    await rejected;
    const timedOut = bridge.requestVaultCredential('vault:azure-devops:second');
    const timeout = expect(timedOut).rejects.toThrow('did not respond in time');
    await vi.advanceTimersByTimeAsync(30_000);
    // assert
    await timeout;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('publishes credential availability to the broker before starting background services', () => {
    // arrange
    const order: string[] = [];
    const bridge = createCredentialBridge({
      parentPort: undefined,
      azureDevOpsCredentials: {
        synchronizeAvailableReferences: (references) => {
          order.push(references.join(','));
        },
      },
      startInitializedBackgroundServices: () => {
        order.push('start');
      },
    });
    // act
    bridge.handleInternalCredentialMessage({
      type: 'credentials.available',
      references: ['vault:azure-devops:account'],
    });
    // assert
    expect(order).toEqual(['vault:azure-devops:account', 'start']);
  });
});
