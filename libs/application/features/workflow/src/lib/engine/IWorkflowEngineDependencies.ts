// #region Imports

import type { IWorkflowDefinition } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import type { IIdGenerator, IPlatformClock } from '@symphony/application-core';
import type { IWorkflowRecordRepository } from '../persistence/IWorkflowRecordRepository';
import type { IWorkflowTrackingPort } from '../ports/IWorkflowTrackingPort';

// #endregion

export interface IWorkflowEngineDependencies {
  readonly workflow: () => IWorkflowDefinition;
  readonly records: IWorkflowRecordRepository;
  readonly tracker: IWorkflowTrackingPort;
  readonly clock: IPlatformClock;
  readonly ids: IIdGenerator;
  /** Identity this orchestrator claims work under. */
  readonly owner: () => string;
  /** Randomness for retry jitter; injected so schedules stay reproducible in tests. */
  readonly jitter?: () => number;
  /**
   * Publishes the work item the tracker returned after a transition. Without it the local
   * projection keeps the stage the item held before the move, and the next guard reads a
   * stage the provider no longer reports.
   */
  readonly workItemChanged?: (item: IWorkItem) => void;
  /**
   * Whether an execution slot is free right now. Supplied by the composition root from the
   * execution accounting; without it the capacity guard cannot be proven and fails closed.
   */
  readonly capacityAvailable?: () => boolean;
}
