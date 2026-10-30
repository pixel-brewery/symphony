// #region Imports
import { primaryDeliveryContext } from '@symphony/configuration-composition';
import { join } from 'node:path';
import { type ICreateRepositorySkillRootReaderDependencies } from './ICreateRepositorySkillRootReaderDependencies';
// #endregion

/**
 * Owns skillRoots commands and their Utility Process lifecycle state.
 *
 * @public
 */
export function createRepositorySkillRootReader(
  dependencies: ICreateRepositorySkillRootReaderDependencies,
) {
  const { settingsState } = dependencies;
  const activeRepositorySkillRoot = (workspaceId?: string): string | undefined => {
    const context = primaryDeliveryContext(settingsState.current, workspaceId);
    const repositoryBindingId =
      context?.defaultRepositoryBindingId ?? context?.repositoryBindingIds[0];
    const repositoryBinding = settingsState.current.repositoryBindings.find(
      (candidate) => candidate.id === repositoryBindingId,
    );
    return repositoryBinding?.localPath
      ? join(repositoryBinding.localPath, '.agents', 'skills')
      : undefined;
  };

  return Object.freeze({ activeRepositorySkillRoot });
}
