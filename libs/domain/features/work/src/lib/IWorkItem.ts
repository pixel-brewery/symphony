// #region Imports

import type { WorkflowStageId } from '@symphony/domain-workflow';
import type { AssistanceAction } from './AssistanceAction';
import type { IWorkItemAssignee } from './IWorkItemAssignee';
import type { IWorkItemComment } from './IWorkItemComment';
import type { IWorkItemCoordination } from './IWorkItemCoordination';
import type { ProjectFieldValue } from './ProjectFieldValue';

// #endregion

export interface IWorkItem {
  id: string;
  /** Missing only on persisted version-one records. */
  workspaceId?: string;
  /** Missing only on persisted version-one records. */
  sourceId?: string;
  externalId: string;
  externalUrl?: string;
  title: string;
  body: string;
  /** Summary items power complete board projections; complete items are hydrated for detail and execution use. */
  detailState?: 'summary' | 'complete';
  bodyFormat?: 'plain-text' | 'markdown' | 'html';
  /**
   * Provider discussion thread, oldest first. Only a complete item carries it; a summary omits
   * it like the body. A complete item of a provider without discussions carries an empty list.
   */
  comments?: readonly IWorkItemComment[];
  workItemType?: string;
  revision?: number;
  nativeState?: string;
  /** Workflow stage the item currently rests in; missing while its column is unmapped. */
  stageId?: WorkflowStageId;
  /** Provider board column that owns the item; missing when the provider reports no column ("No status"). */
  boardColumnId?: string;
  provider: string;
  repository: string;
  repositoryBindingIds?: readonly string[];
  projectFields?: readonly ProjectFieldValue[];
  /** Shared project action. Local execution states must never be projected into this field. */
  assistanceAction?: AssistanceAction;
  /** Shared ownership is independent from assignees and local execution state. */
  coordination?: IWorkItemCoordination;
  labels: readonly string[];
  assignees: readonly IWorkItemAssignee[];
  createdAt?: string;
  updatedAt?: string;
}
