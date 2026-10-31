// #region Imports

import type { ICodexModelOption } from './ICodexModelOption';
import type { ICodexUsageWindow } from './ICodexUsageWindow';

// #endregion

export interface ICodexConfigurationSnapshot {
  readonly models: readonly ICodexModelOption[];
  readonly usage?: {
    readonly planType?: string;
    readonly windows: readonly ICodexUsageWindow[];
    readonly credits?: {
      readonly hasCredits: boolean;
      readonly unlimited: boolean;
      readonly balance?: string;
    };
    readonly tokenUsage?: {
      readonly lifetimeTokens?: number;
      readonly peakDailyTokens?: number;
      readonly currentStreakDays?: number;
    };
  };
  readonly error?: string;
}
