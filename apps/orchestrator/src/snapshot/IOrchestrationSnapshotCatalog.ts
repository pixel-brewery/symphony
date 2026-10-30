// #region Imports

import type { IRuntimeHealth } from '@symphony/domain-platform';
import type { ISkillManifest } from '@symphony/domain-skills';
import type { IWorkflowDefinition } from '@symphony/domain-workflow';

// #endregion

/** Catalog reads consumed by orchestration snapshot assembly. @public */
export interface IOrchestrationSnapshotCatalog {
  workflow(): IWorkflowDefinition;
  health(): Promise<IRuntimeHealth>;
  skills(): readonly ISkillManifest[];
}
