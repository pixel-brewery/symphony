// #region Imports

import type { IRemoteDataStatus } from '@symphony/domain-core';
import type { WorkItemSource } from '@symphony/domain-work';
import type { IWorkItemUnavailablePresentation } from './IWorkItemUnavailablePresentation';

// #endregion

export function resolveWorkItemUnavailablePresentation(
  status: IRemoteDataStatus | undefined,
  sources: readonly WorkItemSource[],
): IWorkItemUnavailablePresentation {
  if (status?.reason === 'rate-limited') {
    return {
      bannerHeader: 'Provider request limit reached',
      bannerContent: 'The provider cannot refresh work items yet. Try again later.',
      emptyHeader: 'Work items unavailable',
      emptyContent: 'Try again after the provider request limit recovers.',
    };
  }
  const azureSources = sources.filter((source) => source.provider === 'azure-devops');
  if (
    status?.reason === 'authentication-required' &&
    azureSources.length > 0 &&
    azureSources.length === sources.length
  ) {
    const [onlySource] = azureSources;
    const source =
      azureSources.length === 1 && onlySource
        ? `“${onlySource.displayName}”`
        : `${azureSources.length} active Azure DevOps sources`;
    return {
      bannerHeader: 'Azure DevOps credential required',
      bannerContent: `Symphony cannot resolve the configured credential for ${source}. Make its PAT or Entra token available to Symphony, then retry.`,
      emptyHeader: 'Azure DevOps work items unavailable',
      emptyContent: 'Make the configured credential available, then retry above.',
    };
  }
  return {
    bannerHeader: 'Work items are temporarily unavailable',
    bannerContent:
      'The work-item provider could not refresh this workspace. Use Retry now to try again.',
    emptyHeader: 'Work items unavailable',
    emptyContent: 'Resolve the connection problem above, then retry.',
  };
}
