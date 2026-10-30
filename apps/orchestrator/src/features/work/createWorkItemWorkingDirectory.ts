// #region Imports
import { primaryDeliveryContext, primaryWorkspace } from '@symphony/configuration-composition';
import { type OrchestratorSettingsState } from '../../composition/OrchestratorSettingsState';
// #endregion
/**
 * Resolves the same repository directory for drafting and read-only relation assessment.
 *
 * @public
 */
export function createWorkItemWorkingDirectory(
  settingsState: Readonly<Pick<OrchestratorSettingsState, 'current'>>,
): (request: {
  readonly workspaceId?: string;
  readonly repository?: string;
}) => string | undefined {
  return (request) =>
    settingsState.current.repositoryBindings.find(
      (repository) =>
        repository.workspaceId === request.workspaceId &&
        `${repository.owner}/${repository.name}` === request.repository,
    )?.localPath ??
    settingsState.current.repositoryBindings.find(
      (repository) =>
        repository.id ===
        primaryDeliveryContext(settingsState.current, request.workspaceId)
          ?.defaultRepositoryBindingId,
    )?.localPath ??
    settingsState.current.repositoryBindings.find(
      (repository) =>
        repository.workspaceId ===
        (request.workspaceId ?? primaryWorkspace(settingsState.current)?.id),
    )?.localPath;
}
