// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IAgentAccountCooldown, IAgentRouteTelemetry } from '@symphony/domain-ai';
import type {
  IAgentAccountCooldownRepository,
  IAgentRouteTelemetryRepository,
} from '@symphony/application-ai';
import { SynapseRoutingStore } from './SynapseRoutingStore';

// #endregion

afterEach(() => vi.restoreAllMocks());

function telemetryRepository(): IAgentRouteTelemetryRepository {
  return { initialize: vi.fn(), load: vi.fn(), save: vi.fn(), removeWorkspace: vi.fn() };
}

function cooldownRepository(): IAgentAccountCooldownRepository {
  return {
    loadAccountCooldown: vi.fn(),
    saveAccountCooldown: vi.fn(),
    clearAccountCooldown: vi.fn(),
    clearWorkspaceAccountCooldowns: vi.fn(),
  };
}

describe('SynapseRoutingStore', () => {
  it('round-trips the existing provider-prefixed SQLite identity and ISO timestamps', () => {
    // arrange
    const repository = telemetryRepository();
    const persisted: IAgentRouteTelemetry = {
      workspaceId: 'workspace',
      routeCandidateId: 'provider:codex',
      attemptCount: 2,
      successCount: 1,
      failureCount: 1,
      consecutiveFailures: 1,
      averageLatencyMilliseconds: 25,
      lastSuccessAt: '2026-08-16T10:00:00.000Z',
      circuitOpenUntil: '2026-08-16T10:05:00.000Z',
    };

    vi.mocked(repository.load).mockReturnValue(persisted);

    const store = new SynapseRoutingStore({ telemetry: repository });

    // act
    const snapshot = store.loadTelemetry('workspace', 'provider', 'codex');

    if (snapshot) store.saveTelemetry(snapshot);

    // assert
    expect(repository.load).toHaveBeenCalledWith('workspace', 'provider:codex');
    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      scopeId: 'workspace',
      kind: 'provider',
      id: 'codex',
      lastSuccessAt: Date.parse(persisted.lastSuccessAt ?? ''),
      circuitOpenUntil: Date.parse(persisted.circuitOpenUntil ?? ''),
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(persisted));
  });

  it('round-trips existing account reasons and timestamps without changing connection identities', () => {
    // arrange
    const repository = cooldownRepository();
    const persisted: IAgentAccountCooldown = {
      workspaceId: 'workspace',
      aiConnectionId: 'connection',
      reason: 'quota-exhausted',
      observedAt: '2026-08-16T10:00:00.000Z',
      retryAt: '2026-08-16T11:00:00.000Z',
    };

    vi.mocked(repository.loadAccountCooldown).mockReturnValue(persisted);

    const store = new SynapseRoutingStore({ cooldowns: repository });

    // act
    const snapshot = store.loadCooldown('workspace', 'connection');

    if (snapshot) store.saveCooldown(snapshot);

    // assert
    expect(repository.loadAccountCooldown).toHaveBeenCalledWith('workspace', 'connection');
    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      scopeId: 'workspace',
      accountId: 'connection',
      reason: 'quota',
      observedAt: Date.parse(persisted.observedAt),
      retryAt: Date.parse(persisted.retryAt),
    });
    expect(repository.saveAccountCooldown).toHaveBeenCalledWith(persisted);
  });

  it('retains native circuit protection when optional durable persistence and its diagnostic sink fail', () => {
    // arrange
    const repository = telemetryRepository();

    vi.mocked(repository.save).mockImplementation(() => {
      throw new Error('SQLite unavailable.');
    });

    const store = new SynapseRoutingStore({
      telemetry: repository,
      onPersistenceError: () => {
        throw new Error('Diagnostic unavailable.');
      },
    });
    const snapshot = {
      schemaVersion: 1 as const,
      scopeId: 'workspace',
      kind: 'candidate' as const,
      id: 'candidate',
      attemptCount: 2,
      successCount: 0,
      failureCount: 2,
      consecutiveFailures: 2,
      circuitOpenUntil: 2000,
    };

    // act
    store.saveTelemetry(snapshot);

    const recovered = store.loadTelemetry('workspace', 'candidate', 'candidate');

    // assert
    expect(recovered).toEqual(snapshot);
    expect(repository.load).not.toHaveBeenCalled();
  });

  it('does not silently cache corrupt persisted cooldown data as absent', () => {
    // arrange
    const repository = cooldownRepository();

    vi.mocked(repository.loadAccountCooldown).mockReturnValue({
      workspaceId: 'workspace',
      aiConnectionId: 'connection',
      reason: 'rate-limited',
      observedAt: 'invalid',
      retryAt: '2026-08-16T11:00:00.000Z',
    });

    const store = new SynapseRoutingStore({ cooldowns: repository });

    // act
    const load = () => store.loadCooldown('workspace', 'connection');

    // assert
    expect(load).toThrow(expect.objectContaining({ code: 'persistence' }));
    expect(load).toThrow(expect.objectContaining({ code: 'persistence' }));
    expect(repository.loadAccountCooldown).toHaveBeenCalledTimes(2);
  });

  it('refuses cross-workspace persisted identity before retaining a snapshot', () => {
    // arrange
    const repository = telemetryRepository();

    vi.mocked(repository.load).mockReturnValue({
      workspaceId: 'other-workspace',
      routeCandidateId: 'candidate',
      attemptCount: 1,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
    });

    const store = new SynapseRoutingStore({ telemetry: repository });

    // act
    const load = () => store.loadTelemetry('workspace', 'candidate', 'candidate');

    // assert
    expect(load).toThrow(expect.objectContaining({ code: 'persistence' }));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('clears one workspace without releasing another workspace account protection', () => {
    // arrange
    const repository = cooldownRepository();
    const store = new SynapseRoutingStore({ cooldowns: repository });

    store.saveCooldown({
      schemaVersion: 1,
      scopeId: 'workspace-a',
      accountId: 'connection',
      reason: 'quota',
      observedAt: 1000,
      retryAt: 2000,
    });
    store.saveCooldown({
      schemaVersion: 1,
      scopeId: 'workspace-b',
      accountId: 'connection',
      reason: 'quota',
      observedAt: 1000,
      retryAt: 2000,
    });

    // act
    store.clearScope('workspace-a');

    // assert
    expect(store.loadCooldown('workspace-a', 'connection')).toBeUndefined();
    expect(store.loadCooldown('workspace-b', 'connection')?.retryAt).toBe(2000);
    expect(repository.clearWorkspaceAccountCooldowns).toHaveBeenCalledWith('workspace-a');
  });

  it('does not downgrade exhausted local protection capacity into a successful optional write', () => {
    // arrange
    const repository = cooldownRepository();
    const diagnostics: unknown[] = [];
    const store = new SynapseRoutingStore({
      cooldowns: repository,
      maximumRecords: 1,
      onPersistenceError: (cause) => diagnostics.push(cause),
    });

    store.saveCooldown({
      schemaVersion: 1,
      scopeId: 'workspace',
      accountId: 'first',
      reason: 'quota',
      observedAt: 1000,
      retryAt: 2000,
    });

    // act
    const save = () =>
      store.saveCooldown({
        schemaVersion: 1,
        scopeId: 'workspace',
        accountId: 'second',
        reason: 'quota',
        observedAt: 1000,
        retryAt: 2000,
      });

    // assert
    expect(save).toThrow(expect.objectContaining({ code: 'persistence' }));
    expect(diagnostics).toHaveLength(0);
    expect(repository.saveAccountCooldown).toHaveBeenCalledTimes(1);
    expect(store.loadCooldown('workspace', 'first')?.retryAt).toBe(2000);
  });
});
