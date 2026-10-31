// #region Imports

import type { JitterSource } from '../retry/JitterSource';

// #endregion

export interface IRoutingContext {
  readonly now: Date;
  readonly jitter: JitterSource;
  /** Fingerprint of the finished run, used to detect loops that make no material progress. */
  readonly progressFingerprint?: string;
}
