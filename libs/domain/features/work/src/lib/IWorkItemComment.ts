// #region Imports

import type { IWorkItemAssignee } from './IWorkItemAssignee';

// #endregion

/**
 * One entry of the discussion a provider keeps on a work item - an issue comment, a work-item
 * discussion post.
 *
 * Comments carry decisions that never make it into the body ("we will order the fields like
 * this"), so a detail view and an analysis that read only the body miss part of the task. The
 * thread is therefore loaded with the complete item, in the order it was written.
 */
export interface IWorkItemComment {
  id: string;
  /** Missing when the provider no longer resolves the author (deleted or hidden account). */
  author?: IWorkItemAssignee;
  body: string;
  bodyFormat?: 'plain-text' | 'markdown' | 'html';
  createdAt: string;
  updatedAt?: string;
  url?: string;
}
