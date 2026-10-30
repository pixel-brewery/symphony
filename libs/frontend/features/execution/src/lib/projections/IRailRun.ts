// #region Imports

import type { RailRunKind } from './RailRunKind';
import type { IRailRunSourceState } from './IRailRunSourceState';

// #endregion

export interface IRailRun {
  readonly id: string;
  readonly kind: RailRunKind;
  readonly sourceLabel: 'Agent' | 'GitHub' | 'Local runner' | 'Action';
  readonly sources?: readonly IRailRunSourceState[];
  readonly title: string;
  readonly message: string;
  readonly state: string;
  readonly statusLabel: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly active: boolean;
  readonly executionId?: string;
  readonly ciRunId?: string;
  readonly runAttempt?: number;
  /** Set on a waiting step, which the operator may withdraw from the queue. */
  readonly queueEntryId?: string;
  readonly externalUrl?: string;
  readonly failureLog?: string;
  readonly localDiagnostics?: string;
}
