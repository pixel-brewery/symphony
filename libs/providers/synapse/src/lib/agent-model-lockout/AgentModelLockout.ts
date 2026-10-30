// #region Imports

import { ModelAvailabilityCache } from '@pixel-brewery/synapse-routing';
import type { AgentModelAvailability } from './AgentModelAvailability';
import type { IAgentModelLockoutOptions } from './IAgentModelLockoutOptions';
import type { IAgentModelTarget } from './IAgentModelTarget';

// #endregion

/** Keeps Symphony's account/model projection while Synapse owns bounded metadata evidence and TTLs.
 * @public
 */
export class AgentModelLockout {
  // #region Fields

  private readonly _cache: ModelAvailabilityCache;

  // #endregion

  // #region Ctor

  /** Composes shared metadata caching without inspecting an account at construction.
   * @public
   * @param options - Existing clock, TTL and operational diagnostic settings.
   */
  public constructor(options: IAgentModelLockoutOptions = {}) {
    this._cache = new ModelAvailabilityCache({
      now: options.now,
      availableMilliseconds: Math.max(0, options.availableCacheMilliseconds ?? 300000),
      unavailableMilliseconds: Math.max(0, options.unavailableCacheMilliseconds ?? 60000),
      unknownMilliseconds: Math.max(0, options.unknownCacheMilliseconds ?? 15000),
      onInspectionError: options.onInspectionError,
    });
  }

  // #endregion

  // #region Properties
  // #endregion

  // #region Methods

  /** Reads only explicit account-scoped evidence and preserves unknown as ordinary execution eligibility.
   * @public
   * @param target - Existing workspace/account/model identity and inspector.
   * @param signal - Operator cancellation.
   * @returns Available, unavailable or unknown account-scoped evidence.
   */
  public async inspect(
    target: IAgentModelTarget,
    signal: AbortSignal,
  ): Promise<AgentModelAvailability> {
    try {
      return await this._cache.inspect(
        target.workspaceId,
        {
          id: target.aiConnectionId,
          instanceId: target.aiConnectionId,
          accountId: target.aiConnectionId,
          model: target.model ?? undefined,
          inspectModelAvailability: target.inspectModelAvailability,
        },
        signal,
      );
    } catch (cause) {
      if (signal.aborted && signal.reason !== undefined) throw signal.reason;
      throw cause;
    }
  }

  /** Invalidates only the selected workspace account's metadata, including late inspection writes.
   * @public
   * @param workspaceId - Existing workspace identity.
   * @param aiConnectionId - Existing AI account connection identity.
   */
  public clearConnection(workspaceId: string, aiConnectionId: string): void {
    this._cache.clearAccount(workspaceId, aiConnectionId);
  }

  /** Invalidates one workspace's cached evidence.
   * @public
   * @param workspaceId - Existing workspace identity.
   */
  public clearWorkspace(workspaceId: string): void {
    this._cache.clearScope(workspaceId);
  }

  /** Clears only this façade's local metadata evidence.
   * @public
   */
  public clear(): void {
    this._cache.clear();
  }

  // #endregion
}
