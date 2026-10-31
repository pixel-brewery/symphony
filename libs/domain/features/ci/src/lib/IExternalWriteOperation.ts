// #region Imports

import type { ICiRun } from './ICiRun';

// #endregion

/** Durable intent for provider writes whose response may be lost. @public */
export interface IExternalWriteOperation {
  readonly id: string;
  readonly scope: string;
  readonly fingerprint: string;
  readonly kind: 'workflow-dispatch' | 'approval';
  readonly state: 'submitting' | 'accepted' | 'uncertain';
  readonly startedAt: string;
  readonly run?: ICiRun;
}
