// #region Imports
import { type IExecutionCatalog } from '@symphony/application-execution';
import { type IWorkItemSkillCatalog } from '@symphony/application-work';
import { type IOrchestrationSnapshotCatalog } from '../snapshot/IOrchestrationSnapshotCatalog';
// #endregion

/**
 * Composes the catalog reads consumed by the services sharing this live object.
 *
 * @public
 */
export type OrchestratorCatalog = IExecutionCatalog &
  IWorkItemSkillCatalog &
  IOrchestrationSnapshotCatalog;
