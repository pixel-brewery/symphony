// #region Imports

import type {
  IAgentAccountCooldownRepository,
  IAgentRouteTelemetryRepository,
} from '@symphony/application-ai';

// #endregion

/**
 * Existing Symphony persistence owners for optional operational routing state.
 *
 * @public
 */
export interface ISynapseRoutingStoreOptions {
  /**
   * Existing workspace/candidate telemetry repository; its schema and IDs remain unchanged.
   */
  readonly telemetry?: IAgentRouteTelemetryRepository;

  /**
   * Existing workspace/account capacity repository.
   */
  readonly cooldowns?: IAgentAccountCooldownRepository;

  /**
   * Bounded local protection retained when optional SQLite persistence is unavailable; default 10000.
   */
  readonly maximumRecords?: number;

  /**
   * Optional operational diagnostic sink; required run/progress/result persistence does not use this bridge.
   *
   * @param cause - Internal storage failure, redacted by the owning diagnostic boundary.
   */
  readonly onPersistenceError?: (cause: unknown) => void;
}
