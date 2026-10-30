// #region Imports

import type { ExecutionEventCategory } from './ExecutionEventCategory';
import type { ExecutionEventKind } from './ExecutionEventKind';
import type { ExecutionEventOrigin } from './ExecutionEventOrigin';

// #endregion

export interface IExecutionEvent {
  id: string;
  executionId: string;
  kind: ExecutionEventKind;
  message: string;
  /** Missing on legacy events, which predate the run-stream projection. */
  origin?: ExecutionEventOrigin;
  /** Missing on legacy events and terminal lifecycle events. */
  category?: ExecutionEventCategory;
  /**
   * Display name of the runtime that produced the event, captured when it was recorded so a
   * mid-run route change keeps the earlier events attributed to the runtime that ran them.
   */
  actor?: string;
  occurredAt: string;
  sequence: number;
}
