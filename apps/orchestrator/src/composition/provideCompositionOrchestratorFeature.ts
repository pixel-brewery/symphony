// #region Imports
import { type IProvideCompositionOrchestratorFeatureDependencies } from './IProvideCompositionOrchestratorFeatureDependencies';
import { requestSchemas, responseSchemas } from '@symphony/ipc-contracts-composition';
import { createOrchestratorRequestHandler } from '../transport/createOrchestratorRequestHandler';
// #endregion

/**
 * Owns composition commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function provideCompositionOrchestratorFeature(
  dependencies: IProvideCompositionOrchestratorFeatureDependencies,
) {
  const {
    snapshotService,
    readNativeConnectionStatus,
    azureDevOpsCredentials,
    settingsState,
    github,
  } = dependencies;

  const handlers = Object.freeze([
    createOrchestratorRequestHandler(
      'snapshot.get',
      requestSchemas['snapshot.get'],
      responseSchemas['snapshot.get'],
      async () => {
        return snapshotService.snapshot();
      },
    ),
    createOrchestratorRequestHandler(
      'snapshot.refresh',
      requestSchemas['snapshot.refresh'],
      responseSchemas['snapshot.refresh'],
      async () => {
        return snapshotService.refreshSnapshot();
      },
    ),
    createOrchestratorRequestHandler(
      'connections.get',
      requestSchemas['connections.get'],
      responseSchemas['connections.get'],
      async () => {
        return {
          ...(await readNativeConnectionStatus()),
          azureDevOps: azureDevOpsCredentials.status(settingsState.current),
        };
      },
    ),
    createOrchestratorRequestHandler(
      'setup.repository.inspect',
      requestSchemas['setup.repository.inspect'],
      responseSchemas['setup.repository.inspect'],
      async (input) => {
        return github.inspectDraftRepository(input.settings, input.repositoryBindingId);
      },
    ),
  ]);
  return Object.freeze({ id: 'composition', handlers });
}
