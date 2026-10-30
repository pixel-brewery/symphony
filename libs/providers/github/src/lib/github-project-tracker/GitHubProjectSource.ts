// #region Imports

import { type WorkItemSource } from '@symphony/domain-work';

// #endregion

export type GitHubProjectSource = Extract<WorkItemSource, { provider: 'github-projects' }>;
