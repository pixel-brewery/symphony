// #region Imports

import type { RepositoryExecutionCapability } from './RepositoryExecutionCapability';

// #endregion

export interface IRepositoryRuntimeStatus {
  repositoryBindingId: string;
  workspaceId: string;
  displayName: string;
  repositoryIdentity: string;
  preparation:
    | { state: 'unprepared' }
    | { state: 'prepared'; path: string; revision: string; managed: boolean };
  trust: {
    state: 'restricted' | 'trusted';
    capabilities: readonly RepositoryExecutionCapability[];
    grantedAt?: string;
  };
}
