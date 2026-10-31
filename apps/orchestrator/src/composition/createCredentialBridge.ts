// #region Imports
import { randomUUID } from 'node:crypto';
import { RemoteProviderAuthenticationRequiredError } from '@symphony/application-core';
import {
  internalCredentialMessageSchema,
  type InternalCredentialMessage,
} from '@symphony/ipc-contracts-core';
import { type ICreateCredentialBridgeDependencies } from './ICreateCredentialBridgeDependencies';
// #endregion

/**
 * Owns credentialBridge commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createCredentialBridge(dependencies: ICreateCredentialBridgeDependencies) {
  const { parentPort, azureDevOpsCredentials, startInitializedBackgroundServices } = dependencies;
  const pendingCredentialResolutions = new Map<
    string,
    {
      readonly reference: string;
      readonly resolve: (credential: string | undefined) => void;
      readonly reject: (error: Error) => void;
      readonly timeout: NodeJS.Timeout;
    }
  >();

  const CREDENTIAL_RESOLUTION_TIMEOUT_MILLISECONDS = 30_000;

  const requestVaultCredential = (reference: string): Promise<string | undefined> => {
    if (!parentPort) return Promise.resolve(undefined);
    const requestId = randomUUID();
    return new Promise<string | undefined>((resolveCredential, rejectCredential) => {
      const timeout = setTimeout(() => {
        pendingCredentialResolutions.delete(requestId);
        rejectCredential(
          new RemoteProviderAuthenticationRequiredError(
            'The operating-system credential store did not respond in time. Try again.',
          ),
        );
      }, CREDENTIAL_RESOLUTION_TIMEOUT_MILLISECONDS);
      pendingCredentialResolutions.set(requestId, {
        reference,
        resolve: resolveCredential,
        reject: rejectCredential,
        timeout,
      });
      parentPort.postMessage(
        internalCredentialMessageSchema.parse({
          type: 'credentials.resolve.request',
          requestId,
          reference,
        }),
      );
    });
  };

  function handleInternalCredentialMessage(message: InternalCredentialMessage): void {
    switch (message.type) {
      case 'credentials.available':
        azureDevOpsCredentials.synchronizeAvailableReferences(message.references);
        startInitializedBackgroundServices();
        return;
      case 'credentials.resolve.response': {
        const pending = pendingCredentialResolutions.get(message.requestId);
        if (!pending) return;
        pendingCredentialResolutions.delete(message.requestId);
        clearTimeout(pending.timeout);
        if (pending.reference !== message.reference) {
          pending.reject(new Error('The credential response did not match its request.'));
          return;
        }
        switch (message.result.status) {
          case 'resolved':
            pending.resolve(message.result.secret);
            return;
          case 'missing':
            pending.resolve(undefined);
            return;
          case 'unavailable':
            pending.reject(
              new RemoteProviderAuthenticationRequiredError(
                'Unlock or authorize the operating-system credential store and try again.',
              ),
            );
            return;
        }
        return;
      }
      case 'credentials.resolve.request':
        return;
    }
  }

  return Object.freeze({ requestVaultCredential, handleInternalCredentialMessage });
}
