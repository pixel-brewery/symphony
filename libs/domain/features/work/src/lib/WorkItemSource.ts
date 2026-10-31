// #region Imports

import type { IBoardColumnMapping } from './IBoardColumnMapping';

// #endregion

export type WorkItemSource =
  | {
      id: string;
      workspaceId: string;
      connectionId: string;
      provider: 'azure-devops';
      displayName: string;
      project: string;
      team?: string;
      queryId?: string;
      wiql?: string;
      boardId?: string;
      /** Maps board columns (or work-item states when no board is bound) to orchestration states. */
      columnMappings?: readonly IBoardColumnMapping[];
      enabled: boolean;
    }
  | {
      id: string;
      workspaceId: string;
      connectionId: string;
      provider: 'github-projects';
      displayName: string;
      ownerType: 'organization' | 'user';
      owner: string;
      projectNumber: number;
      /** Maps project status options (by option id) to orchestration states. */
      columnMappings?: readonly IBoardColumnMapping[];
      enabled: boolean;
    }
  | {
      id: string;
      workspaceId: string;
      connectionId: string;
      provider: 'simulated';
      displayName: string;
      project: string;
      enabled: boolean;
    };
