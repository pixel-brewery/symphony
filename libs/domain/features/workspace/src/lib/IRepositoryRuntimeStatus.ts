// #region Imports

import type { RepositoryExecutionCapability } from './RepositoryExecutionCapability';

// #endregion

export interface IRepositoryRuntimeStatus {
  repositoryBindingId: string;
  workspaceId: string;
  displayName: string;
  repositoryIdentity: string;
  preparation:
    | {
        state: 'unprepared';
        /** Read-only inspection failed; this is not confirmation that the folder is absent. */
        inspectionError?: string;
      }
    | { state: 'prepared'; path: string; revision: string; managed: boolean };
  trust: {
    state: 'restricted' | 'trusted';
    capabilities: readonly RepositoryExecutionCapability[];
    grantedAt?: string;
  };
}
