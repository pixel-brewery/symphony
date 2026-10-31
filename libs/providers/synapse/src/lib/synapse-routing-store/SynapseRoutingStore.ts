// #region Imports

import { AiError } from '@pixel-brewery/synapse-core';
import { MemoryRoutingStore, RoutingStoreBase } from '@pixel-brewery/synapse-routing';
import type { IAccountCooldown, IRouteTelemetry } from '@pixel-brewery/synapse-routing';
import type { IAgentAccountCooldown, IAgentRouteTelemetry } from '@symphony/domain-ai';
import { cooldownKey } from '../agent-account-cooldown/cooldownKey';
import { timestamp } from '../agent-route-governor/timestamp';
import type { ISynapseRoutingStoreOptions } from './interfaces/ISynapseRoutingStoreOptions';

// #endregion

/**
 * Keeps Symphony's SQLite identities and ISO timestamps behind Synapse's neutral state contract.
 *
 * @remarks Only optional operational telemetry/cooldowns degrade to bounded memory. Required execution persistence remains outside this adapter.
 *
 * @public
 */
export class SynapseRoutingStore extends RoutingStoreBase {
  // #region Fields

  private readonly _fallback: MemoryRoutingStore;
  private readonly _maximumRecords: number;
  private readonly _loadedCooldowns = new Map<string, string>();

  // #endregion

  // #region Ctor

  /**
   * Composes existing persistence without reading or mutating the database during construction.
   *
   * @param _options - Existing repository owners and optional diagnostic policy.
   *
   * @public
   */
  public constructor(private readonly _options: ISynapseRoutingStoreOptions = {}) {
    super();
    this._maximumRecords = _options.maximumRecords ?? 10000;
    this._fallback = new MemoryRoutingStore(this._maximumRecords);
  }

  // #endregion

  // #region Methods

  /**
   * Reads a cached or persisted candidate/provider history using the unchanged legacy key.
   *
   * @param scopeId - Symphony workspace identity.
   * @param kind - Candidate history or shared provider history.
   * @param id - Candidate ID or provider ID before the legacy provider prefix.
   * @returns A versioned epoch-millisecond snapshot, or undefined for missing/temporarily unavailable optional data.
   * @throws An AiError when persisted identity/data is invalid or bounded local protection cannot be retained.
   *
   * @public
   */
  public override loadTelemetry(
    scopeId: string,
    kind: 'candidate' | 'provider',
    id: string,
  ): IRouteTelemetry | undefined {
    const cached = this._fallback.loadTelemetry(scopeId, kind, id);

    if (cached) return cached;

    const legacyId = this.legacyTelemetryId(kind, id);
    let persisted: IAgentRouteTelemetry | undefined;

    try {
      persisted = this._options.telemetry?.load(scopeId, legacyId);
    } catch (cause) {
      this.report(cause);

      return undefined;
    }

    if (!persisted) return undefined;

    if (persisted.workspaceId !== scopeId || persisted.routeCandidateId !== legacyId)
      throw new AiError(
        'persistence',
        'Stored Symphony route history belongs to another routing identity.',
      );

    const snapshot: IRouteTelemetry = {
      schemaVersion: 1,
      scopeId,
      kind,
      id,
      attemptCount: persisted.attemptCount,
      successCount: persisted.successCount,
      failureCount: persisted.failureCount,
      consecutiveFailures: persisted.consecutiveFailures,
      averageLatencyMilliseconds: persisted.averageLatencyMilliseconds,
      lastAttemptAt: this.epoch(persisted.lastAttemptAt),
      lastSuccessAt: this.epoch(persisted.lastSuccessAt),
      lastFailureAt: this.epoch(persisted.lastFailureAt),
      circuitOpenUntil: this.epoch(persisted.circuitOpenUntil),
    };

    this._fallback.saveTelemetry(snapshot);

    return this._fallback.loadTelemetry(scopeId, kind, id);
  }

  /**
   * Retains in-process circuit protection before best-effort persistence through the existing SQLite owner.
   *
   * @param telemetry - Complete neutral history snapshot.
   * @throws An AiError if the bounded local store cannot retain valid history.
   *
   * @public
   */
  public override saveTelemetry(telemetry: IRouteTelemetry): void {
    this._fallback.saveTelemetry(telemetry);

    const legacy: IAgentRouteTelemetry = {
      workspaceId: telemetry.scopeId,
      routeCandidateId: this.legacyTelemetryId(telemetry.kind, telemetry.id),
      attemptCount: telemetry.attemptCount,
      successCount: telemetry.successCount,
      failureCount: telemetry.failureCount,
      consecutiveFailures: telemetry.consecutiveFailures,
      averageLatencyMilliseconds: telemetry.averageLatencyMilliseconds,
      lastAttemptAt: this.iso(telemetry.lastAttemptAt),
      lastSuccessAt: this.iso(telemetry.lastSuccessAt),
      lastFailureAt: this.iso(telemetry.lastFailureAt),
      circuitOpenUntil: this.iso(telemetry.circuitOpenUntil),
    };

    try {
      this._options.telemetry?.save(legacy);
    } catch (cause) {
      this.report(cause);
    }
  }

  /**
   * Reads workspace/account protection while preserving legacy negative-cache behavior.
   *
   * @param scopeId - Symphony workspace identity.
   * @param accountId - Existing AI connection identity.
   * @returns Versioned account-capacity evidence, if available.
   * @throws An AiError if persisted account identity/data is invalid or local protection cannot be retained.
   *
   * @public
   */
  public override loadCooldown(scopeId: string, accountId: string): IAccountCooldown | undefined {
    const cached = this._fallback.loadCooldown(scopeId, accountId);

    if (cached) return cached;

    const key = cooldownKey(scopeId, accountId);

    if (this._loadedCooldowns.has(key)) return undefined;

    let persisted: IAgentAccountCooldown | undefined;

    try {
      persisted = this._options.cooldowns?.loadAccountCooldown(scopeId, accountId);
    } catch (cause) {
      this.report(cause);

      return undefined;
    }

    if (!persisted) {
      this.rememberCooldown(scopeId, accountId);

      return undefined;
    }

    if (persisted.workspaceId !== scopeId || persisted.aiConnectionId !== accountId)
      throw new AiError(
        'persistence',
        'Stored Symphony cooldown belongs to another workspace account.',
      );

    const observedAt = this.epoch(persisted.observedAt);
    const retryAt = this.epoch(persisted.retryAt);

    if (observedAt === undefined || retryAt === undefined)
      throw new AiError('persistence', 'Stored Symphony cooldown timestamps are invalid.');

    if (persisted.reason !== 'quota-exhausted' && persisted.reason !== 'rate-limited')
      throw new AiError('persistence', 'Stored Symphony cooldown classification is invalid.');

    const snapshot: IAccountCooldown = {
      schemaVersion: 1,
      scopeId,
      accountId,
      reason: persisted.reason === 'quota-exhausted' ? 'quota' : 'rate-limit',
      observedAt,
      retryAt,
    };

    this._fallback.saveCooldown(snapshot);
    this.rememberCooldown(scopeId, accountId);

    return this._fallback.loadCooldown(scopeId, accountId);
  }

  /**
   * Retains the capacity pause locally before optional durable persistence.
   *
   * @param cooldown - Explicit account-wide native capacity evidence.
   * @throws An AiError if valid local protection cannot be retained within the bound.
   *
   * @public
   */
  public override saveCooldown(cooldown: IAccountCooldown): void {
    this._fallback.saveCooldown(cooldown);
    this.rememberCooldown(cooldown.scopeId, cooldown.accountId);

    const legacy: IAgentAccountCooldown = {
      workspaceId: cooldown.scopeId,
      aiConnectionId: cooldown.accountId,
      reason: cooldown.reason === 'quota' ? 'quota-exhausted' : 'rate-limited',
      observedAt: new Date(cooldown.observedAt).toISOString(),
      retryAt: new Date(cooldown.retryAt).toISOString(),
    };

    try {
      this._options.cooldowns?.saveAccountCooldown(legacy);
    } catch (cause) {
      this.report(cause);
    }
  }

  /**
   * Clears only the selected connection pause, keeping failed durable removal from resurrecting it in-process.
   *
   * @param scopeId - Symphony workspace identity.
   * @param accountId - AI connection identity.
   *
   * @public
   */
  public override clearAccount(scopeId: string, accountId: string): void {
    this._fallback.clearAccount(scopeId, accountId);
    this.rememberCooldown(scopeId, accountId);

    try {
      this._options.cooldowns?.clearAccountCooldown(scopeId, accountId);
    } catch (cause) {
      this.report(cause);
    }
  }

  /**
   * Releases only the selected workspace's optional routing state.
   *
   * @param scopeId - Existing workspace identity.
   *
   * @public
   */
  public override clearScope(scopeId: string): void {
    this._fallback.clearScope(scopeId);

    for (const [key, workspaceId] of this._loadedCooldowns)
      if (workspaceId === scopeId) this._loadedCooldowns.delete(key);

    try {
      this._options.telemetry?.removeWorkspace(scopeId);
    } catch (cause) {
      this.report(cause);
    }

    try {
      this._options.cooldowns?.clearWorkspaceAccountCooldowns(scopeId);
    } catch (cause) {
      this.report(cause);
    }
  }

  private legacyTelemetryId(kind: 'candidate' | 'provider', id: string): string {
    return kind === 'provider' ? `provider:${id}` : id;
  }

  private epoch(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;

    const parsed = timestamp(value);

    if (!Number.isFinite(parsed))
      throw new AiError('persistence', 'Stored Symphony routing timestamp is invalid.');

    return parsed;
  }

  private iso(value: number | undefined): string | undefined {
    return value === undefined ? undefined : new Date(value).toISOString();
  }

  private rememberCooldown(scopeId: string, accountId: string): void {
    const key = cooldownKey(scopeId, accountId);

    if (!this._loadedCooldowns.has(key) && this._loadedCooldowns.size >= this._maximumRecords) {
      const oldest = this._loadedCooldowns.keys().next().value;

      if (oldest !== undefined) this._loadedCooldowns.delete(oldest);
    }

    this._loadedCooldowns.set(key, scopeId);
  }

  private report(cause: unknown): void {
    try {
      this._options.onPersistenceError?.(cause);
    } catch {
      /* Optional diagnostics never alter provider execution semantics. */
    }
  }

  // #endregion
}
