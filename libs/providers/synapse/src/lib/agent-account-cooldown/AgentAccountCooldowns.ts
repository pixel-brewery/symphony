// #region Imports

import { AiError } from '@pixel-brewery/synapse-core';
import { AccountCooldowns } from '@pixel-brewery/synapse-routing';
import type { IAccountCooldown } from '@pixel-brewery/synapse-routing';
import type { IAgentAccountCooldown } from '@symphony/domain-ai';
import type { IAgentAccountCooldownRepository } from '@symphony/application-ai';
import { SynapseRoutingStore } from '../synapse-routing-store/SynapseRoutingStore';
import { AgentAccountCapacityError } from './AgentAccountCapacityError';
import { AgentAccountCoolingDownError } from './AgentAccountCoolingDownError';
import type { IAgentAccountCooldownOptions } from './IAgentAccountCooldownOptions';
import type { IAgentAccountCooldownTarget } from './IAgentAccountCooldownTarget';
import { timestamp } from './timestamp';

// #endregion

/** Maps Symphony recovery errors and SQLite identities onto Synapse account-capacity protection.
 * @public
 */
export class AgentAccountCooldowns {
  // #region Fields

  private readonly _store: SynapseRoutingStore;
  private readonly _cooldowns: AccountCooldowns;

  // #endregion

  // #region Ctor

  /** Composes existing optional persistence with bounded local capacity protection.
   * @public
   * @param repository - Existing Symphony SQLite account-cooldown owner.
   * @param options - Existing clock, capacity budgets and operational diagnostic callback.
   */
  public constructor(
    repository?: IAgentAccountCooldownRepository,
    options: IAgentAccountCooldownOptions = {},
  ) {
    this._store = new SynapseRoutingStore({
      cooldowns: repository,
      onPersistenceError: options.onPersistenceError,
    });
    const rate = Math.max(1000, options.rateLimitCooldownMilliseconds ?? 60000);
    const quota = Math.max(1000, options.quotaCooldownMilliseconds ?? 900000);
    const now = options.now;
    this._cooldowns = new AccountCooldowns(this._store, {
      now: now ? () => now().getTime() : undefined,
      rateLimitMilliseconds: rate,
      quotaMilliseconds: quota,
      maximumMilliseconds: Math.max(rate, quota, options.maximumCooldownMilliseconds ?? 2678400000),
    });
  }

  // #endregion

  // #region Properties
  // #endregion

  // #region Methods

  /** Reads an account-wide pause using unchanged workspace and connection IDs.
   * @public
   * @param target - Existing workspace/account projection.
   * @returns Existing ISO-timestamp recovery contract, if still paused.
   */
  public active(target: IAgentAccountCooldownTarget): IAgentAccountCooldown | undefined {
    const value = this._cooldowns.active(target.workspaceId, target.aiConnectionId);
    return value ? this.legacy(value) : undefined;
  }

  /** Converts an explicitly classified native account failure into shared capacity evidence.
   * @public
   * @param target - Existing workspace/account projection.
   * @param failure - Existing domain interruption with capacity classification.
   * @returns ISO-timestamp account pause used by durable Symphony recovery.
   */
  public recordFailure(
    target: IAgentAccountCooldownTarget,
    failure: AgentAccountCapacityError,
  ): IAgentAccountCooldown {
    const retryAt = timestamp(failure.retryAt);
    const value = this._cooldowns.recordFailure(
      target.workspaceId,
      target.aiConnectionId,
      new AiError(failure.reason === 'quota-exhausted' ? 'quota' : 'rate-limit', failure.message, {
        capacityScope: 'account',
        retryable: true,
        retryAt: Number.isFinite(retryAt) ? retryAt : undefined,
      }),
    );
    if (!value)
      throw new Error('An explicitly classified account failure must produce capacity evidence.');
    return this.legacy(value);
  }

  /** Preserves the existing Analyzer interruption subclass and user recovery message.
   * @public
   * @param target - Existing account label and identity.
   * @param cooldown - Existing ISO-timestamp pause.
   * @returns The existing domain recovery error used by Analyzer reactivation.
   */
  public coolingDownError(
    target: IAgentAccountCooldownTarget,
    cooldown: IAgentAccountCooldown,
  ): AgentAccountCoolingDownError {
    return new AgentAccountCoolingDownError(target.label, cooldown.reason, cooldown.retryAt);
  }

  /** Clears only one workspace connection's pause after explicit account recovery.
   * @public
   * @param workspaceId - Existing workspace identity.
   * @param aiConnectionId - Existing AI connection identity.
   */
  public clearConnection(workspaceId: string, aiConnectionId: string): void {
    this._cooldowns.clearAccount(workspaceId, aiConnectionId);
  }

  /** Removes only one workspace's optional account-capacity state.
   * @public
   * @param workspaceId - Existing workspace identity.
   */
  public clearWorkspace(workspaceId: string): void {
    this._store.clearScope(workspaceId);
  }

  private legacy(value: IAccountCooldown): IAgentAccountCooldown {
    return {
      workspaceId: value.scopeId,
      aiConnectionId: value.accountId,
      reason: value.reason === 'quota' ? 'quota-exhausted' : 'rate-limited',
      observedAt: new Date(value.observedAt).toISOString(),
      retryAt: new Date(value.retryAt).toISOString(),
    };
  }

  // #endregion
}
