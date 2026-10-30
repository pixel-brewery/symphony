// #region Imports
import { installAllowedCommandWithHomebrew } from '@symphony/providers-core';
import { type ProviderConnection } from '@symphony/configuration-composition';
import {
  startGitHubBrowserLogin,
  loginGitHubWithToken,
  logoutGitHub,
} from '@symphony/providers-github';
import { type IProvidePlatformOrchestratorFeatureDependencies } from './IProvidePlatformOrchestratorFeatureDependencies';
import { platformRequestSchemas, platformResponseSchemas } from '@symphony/ipc-contracts-platform';
import { createOrchestratorRequestHandler } from '../../transport/createOrchestratorRequestHandler';
import { type IActiveRuntimeInstallation } from './IActiveRuntimeInstallation';
// #endregion

/**
 * Owns platform commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function providePlatformOrchestratorFeature(
  dependencies: IProvidePlatformOrchestratorFeatureDependencies,
) {
  const {
    githubServiceStatus,
    catalog,
    storageGovernor,
    settingsState,
    azureDevOpsCredentials,
    azureDevOpsTracker,
  } = dependencies;
  let activeRuntimeDependencyInstallation:
    | {
        readonly command: 'git' | 'gh' | 'codex' | 'claude' | 'opencode';
        readonly controller: AbortController;
        readonly completion: Promise<unknown>;
      }
    | undefined;

  async function externalServiceIncidents() {
    const mode = process.env['SYMPHONY_EXTERNAL_SERVICE_STATUS_MODE'];
    if (
      mode === 'operational' ||
      (!mode && process.env['SYMPHONY_CONNECTION_MODE'] === 'simulated')
    ) {
      return [];
    }
    if (mode === 'simulated-outage') {
      return [
        {
          id: 'simulated-service-status',
          providerName: 'GitHub',
          severity: 'outage' as const,
          affectedComponents: ['Actions'],
          affectedCapabilities: ['automation'] as const,
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      return await githubServiceStatus.incidents(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }
  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'health.get',
      platformRequestSchemas['health.get'],
      platformResponseSchemas['health.get'],
      async () => {
        return catalog.health();
      },
    ),
    createOrchestratorRequestHandler(
      'runtime-dependencies.install',
      platformRequestSchemas['runtime-dependencies.install'],
      platformResponseSchemas['runtime-dependencies.install'],
      async (input) => {
        if (activeRuntimeDependencyInstallation) {
          throw new Error(
            `Homebrew is already installing ${activeRuntimeDependencyInstallation.command}.`,
          );
        }
        const controller = new AbortController();
        const completion = installAllowedCommandWithHomebrew(input.command, controller.signal);
        activeRuntimeDependencyInstallation = { command: input.command, controller, completion };
        try {
          await completion;
          return catalog.health();
        } finally {
          activeRuntimeDependencyInstallation = undefined;
        }
      },
    ),
    createOrchestratorRequestHandler(
      'external-services.incidents.get',
      platformRequestSchemas['external-services.incidents.get'],
      platformResponseSchemas['external-services.incidents.get'],
      async () => {
        return externalServiceIncidents();
      },
    ),
    createOrchestratorRequestHandler(
      'storage.status.get',
      platformRequestSchemas['storage.status.get'],
      platformResponseSchemas['storage.status.get'],
      async () => {
        return storageGovernor.report();
      },
    ),
    createOrchestratorRequestHandler(
      'azure-devops.login.start',
      platformRequestSchemas['azure-devops.login.start'],
      platformResponseSchemas['azure-devops.login.start'],
      async (input) => {
        const connection = settingsState.current.connections.find(
          (
            candidate,
          ): candidate is Extract<ProviderConnection, { readonly kind: 'azure-devops' }> =>
            candidate.id === input.connectionId && candidate.kind === 'azure-devops',
        );
        if (!connection) throw new Error('The selected Azure DevOps connection is unavailable.');
        const source = settingsState.current.workItemSources.find(
          (candidate) =>
            candidate.provider === 'azure-devops' &&
            candidate.connectionId === connection.id &&
            candidate.workspaceId === connection.workspaceId,
        );
        if (!source)
          throw new Error('Save the Azure DevOps work-item source before connecting it.');
        const reference = azureDevOpsCredentials.reference(connection.id);
        const previousSettings = settingsState.current;
        const previousCredential = await azureDevOpsCredentials.resolve(connection);
        azureDevOpsCredentials.set(reference, input.token);
        settingsState.current = {
          ...settingsState.current,
          connections: settingsState.current.connections.map((candidate) =>
            candidate.id === connection.id ? { ...candidate, credentialRef: reference } : candidate,
          ),
        };
        try {
          if (azureDevOpsTracker) await azureDevOpsTracker.listSourceColumns(source);
          settingsState.current = settingsState.save(settingsState.current);
        } catch (cause) {
          settingsState.current = previousSettings;
          azureDevOpsCredentials.remove(reference);
          if (connection.credentialRef === reference && previousCredential) {
            azureDevOpsCredentials.set(reference, previousCredential.token);
          }
          throw cause;
        }
        return {
          status: 'completed' as const,
          message: 'Azure DevOps personal access token verified and stored securely.',
        };
      },
    ),
    createOrchestratorRequestHandler(
      'azure-devops.logout',
      platformRequestSchemas['azure-devops.logout'],
      platformResponseSchemas['azure-devops.logout'],
      async (input) => {
        const connection = settingsState.current.connections.find(
          (
            candidate,
          ): candidate is Extract<ProviderConnection, { readonly kind: 'azure-devops' }> =>
            candidate.id === input.connectionId && candidate.kind === 'azure-devops',
        );
        if (!connection) throw new Error('The selected Azure DevOps connection is unavailable.');
        const reference = azureDevOpsCredentials.reference(connection.id);
        azureDevOpsCredentials.remove(reference);
        settingsState.current = settingsState.save({
          ...settingsState.current,
          connections: settingsState.current.connections.map((candidate) => {
            if (candidate.id !== connection.id || candidate.kind !== 'azure-devops')
              return candidate;
            return { ...candidate, credentialRef: undefined };
          }),
        });
        return { status: 'completed' as const, message: 'Azure DevOps disconnected.' };
      },
    ),
    createOrchestratorRequestHandler(
      'github.login.start',
      platformRequestSchemas['github.login.start'],
      platformResponseSchemas['github.login.start'],
      async (input) => {
        if (input.mode === 'browser') {
          startGitHubBrowserLogin(input.hostname, input.gitProtocol);
          return {
            status: 'started',
            message: 'GitHub browser sign-in started. Complete the flow and refresh status.',
          };
        }
        await loginGitHubWithToken(input.hostname, input.gitProtocol, input.token);
        return { status: 'completed', message: 'GitHub authentication was stored by GitHub CLI.' };
      },
    ),
    createOrchestratorRequestHandler(
      'github.logout',
      platformRequestSchemas['github.logout'],
      platformResponseSchemas['github.logout'],
      async (input) => {
        await logoutGitHub(input.hostname, input.login);
        return { status: 'completed', message: 'GitHub account disconnected.' };
      },
    ),
  ]);
  return Object.freeze({
    id: 'platform',
    handlers,
    activeInstallation: (): IActiveRuntimeInstallation | undefined =>
      activeRuntimeDependencyInstallation,
  });
}
