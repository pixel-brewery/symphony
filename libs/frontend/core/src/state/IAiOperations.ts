// #region Imports

import type { Signal } from '@angular/core';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { AiUsageProvider } from './AiUsageProvider';
import type { IAiUsageWindow } from './IAiUsageWindow';

// #endregion

/**
 * Consumed AI capability contract for existing aggregate consumers during their migration.
 *
 * @public
 */
export interface IAiOperations {
  /**
   * AI-owned account configuration projection.
   *
   * @public
   * @readonly
   */
  readonly codexConfiguration: Signal<ResponsePayload<'codex.configuration.get'> | undefined>;
  /**
   * Account associated with the current projection.
   *
   * @public
   * @readonly
   */
  readonly codexConfigurationAccountId: Signal<string | undefined>;
  /**
   * AI-owned model catalog.
   *
   * @public
   * @readonly
   */
  readonly availableAiModels: Signal<ResponsePayload<'ai.models.get'> | undefined>;
  /**
   * AI-owned model intelligence report.
   *
   * @public
   * @readonly
   */
  readonly modelIntelligence: Signal<ResponsePayload<'ai.intelligence.get'> | undefined>;
  /**
   * Current account-configuration request.
   *
   * @public
   * @readonly
   */
  readonly codexConfigurationBusy: Signal<boolean>;
  /**
   * Current runtime model request.
   *
   * @public
   * @readonly
   */
  readonly availableAiModelsBusy: Signal<boolean>;
  /**
   * Current model-intelligence request.
   *
   * @public
   * @readonly
   */
  readonly modelIntelligenceBusy: Signal<boolean>;
  /**
   * AI-owned login and logout lifecycle.
   *
   * @public
   * @readonly
   */
  readonly connectionBusy: Signal<boolean>;
  /**
   * Refreshes the selected or explicitly requested account.
   *
   * @public
   */
  refreshCodexConfiguration(accountId?: string): Promise<boolean>;
  /**
   * Invalidates in-flight account results and clears their projection.
   *
   * @public
   */
  clearCodexConfiguration(): void;
  /**
   * Refreshes one account's quota windows with the existing stale-request guard.
   *
   * @public
   */
  refreshAiUsage(input: {
    readonly connectionId: string;
    readonly provider: AiUsageProvider;
  }): Promise<boolean>;
  /**
   * Reads the feature-owned usage windows for one account.
   *
   * @public
   */
  aiUsageFor(connectionId: string): readonly IAiUsageWindow[] | undefined;
  /**
   * Reads whether one account is refreshing.
   *
   * @public
   */
  aiUsageBusyFor(connectionId: string): boolean;
  /**
   * Refreshes scoped runtime model options.
   *
   * @public
   */
  refreshAvailableAiModels(input: RequestPayload<'ai.models.get'>): Promise<boolean>;
  /**
   * Refreshes model-intelligence metadata for the requested models.
   *
   * @public
   */
  refreshModelIntelligence(input: RequestPayload<'ai.intelligence.get'>): Promise<boolean>;
  /**
   * Starts the selected Codex authentication method.
   *
   * @public
   */
  connectCodex(input: RequestPayload<'codex.login.start'>): Promise<boolean>;
  /**
   * Disconnects one isolated Codex account.
   *
   * @public
   */
  disconnectCodex(accountId: string): Promise<boolean>;
  /**
   * Starts one isolated Claude sign-in.
   *
   * @public
   */
  connectClaude(accountId: string): Promise<boolean>;
  /**
   * Completes the active Claude authorization step.
   *
   * @public
   */
  completeClaudeLogin(accountId: string, authorizationCode: string): Promise<boolean>;
  /**
   * Disconnects one isolated Claude account.
   *
   * @public
   */
  disconnectClaude(accountId: string): Promise<boolean>;
  /**
   * Imports existing provider credentials into one isolated OpenCode account.
   *
   * @public
   */
  importOpenCodeCredentials(accountId: string): Promise<boolean>;
}
