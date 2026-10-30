// #region Imports

import type { IIssueDraftRequest, IWorkItem } from '@symphony/domain-work';
import type { IIssueDraftingPort } from './IIssueDraftingPort';
import type { IWorkItemSkillCatalog } from './IWorkItemSkillCatalog';
import type { IWorkItemTrackingPort } from './IWorkItemTrackingPort';

// #endregion

/**
 * Supplies the focused effects needed by Work Item editing and owned draft operations.
 *
 * @public
 */
export interface IWorkItemServiceDependencies {
  /**
   * The consumed tracker editing and metadata operations.
   *
   * @public
   */
  tracker: IWorkItemTrackingPort;

  /**
   * The provider-neutral Work Item Creator invocation.
   *
   * @public
   */
  issueDrafter: IIssueDraftingPort;

  /**
   * Workspace-owned packages and their public manifests.
   *
   * @public
   */
  catalog: IWorkItemSkillCatalog;

  /**
   * Resolves the admitted working directory for one draft request.
   *
   * @public
   */
  workingDirectory: (request: IIssueDraftRequest) => string | undefined;

  /**
   * Loads the complete item and discussion before publishing an operator comment.
   *
   * @public
   */
  workItemDetails: (workItemId: string) => Promise<IWorkItem>;

  /**
   * Publishes the same created or updated item into the existing application projection.
   *
   * @public
   */
  workItemChanged?: (workItem: IWorkItem) => void;
}
