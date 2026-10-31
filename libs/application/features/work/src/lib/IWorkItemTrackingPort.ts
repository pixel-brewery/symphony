// #region Imports

import type {
  IWorkItem,
  IWorkItemComment,
  IWorkItemEditorMetadata,
  IWorkItemMutation,
} from '@symphony/domain-work';

// #endregion

/**
 * Exposes only the tracker operations consumed by Work Item editing and drafting.
 *
 * @public
 */
export interface IWorkItemTrackingPort {
  /**
   * Reads the current editor choices for the addressed repository and source.
   *
   * @public
   */
  listEditorMetadata(
    repository?: string,
    workspaceId?: string,
    sourceId?: string,
  ): Promise<IWorkItemEditorMetadata>;

  /**
   * Creates one item using provider-neutral editor values.
   *
   * @public
   */
  createWorkItem(input: IWorkItemMutation): Promise<IWorkItem>;

  /**
   * Updates one item using provider-neutral editor values.
   *
   * @public
   */
  updateWorkItem(workItemId: string, input: IWorkItemMutation): Promise<IWorkItem>;

  /**
   * Moves an item to the exact provider board column selected by the operator.
   *
   * @public
   */
  moveToColumn(workItemId: string, boardColumnId: string): Promise<IWorkItem>;

  /**
   * Writes one comment when the provider supports a discussion thread.
   *
   * @public
   */
  createWorkItemComment?(workItemId: string, body: string): Promise<IWorkItemComment>;
}
