// #region Imports

import type { IActionDrawerSourceState } from './IActionDrawerSourceState';

// #endregion

/** Only the existing run facts consumed by the CI Action drawer. @public */
export interface IActionDrawerRun {
  readonly kind: 'agent' | 'cloud-action' | 'local-action';
  /** Localized display copy; decisions use the stable `kind` discriminator. */
  readonly sourceLabel: string;
  readonly sources?: readonly IActionDrawerSourceState[];
  readonly title: string;
  readonly message: string;
  readonly state: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly active: boolean;
  readonly ciRunId?: string;
  readonly runAttempt?: number;
  readonly externalUrl?: string;
  readonly failureLog?: string;
  readonly localDiagnostics?: string;
}
