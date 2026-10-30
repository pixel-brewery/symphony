// #region Imports

import { type ProjectFieldDefinition } from '@symphony/domain-work';
import type { GitHubConnection } from './GitHubConnection';
import type { GitHubProjectSource } from './GitHubProjectSource';

// #endregion

export interface IProjectContext {
  readonly source: GitHubProjectSource;
  readonly connection: GitHubConnection;
  readonly environment: NodeJS.ProcessEnv;
  readonly projectId: string;
  readonly fields: readonly ProjectFieldDefinition[];
}
