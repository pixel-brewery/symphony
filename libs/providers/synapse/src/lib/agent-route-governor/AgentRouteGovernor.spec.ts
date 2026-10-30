// #region Imports

import { describe, expect, it } from 'vitest';
import type { IAgentRouteTelemetry } from '@symphony/domain-ai';
import type { IAgentRouteTelemetryRepository } from '@symphony/application-ai';
import type { AgentRouteCostClass, AgentRouteStrategy } from '@symphony/domain-ai';
import { AgentRouteGovernor } from './AgentRouteGovernor';
import { AgentRoutesCoolingDownError } from './AgentRoutesCoolingDownError';
import type { IAgentRouteDescriptor } from './IAgentRouteDescriptor';

// #endregion

describe('AgentRouteGovernor', () => {
  it('applies every configured route strategy deterministically within an agent', () => {
    // arrange
    const repository = new MemoryTelemetryRepository();
    const now = new Date('2026-08-16T10:00:00.000Z');
    repository.save(
      telemetry('fast-paid', {
        attemptCount: 10,
        successCount: 9,
        failureCount: 1,
        averageLatencyMilliseconds: 100,
        lastSuccessAt: '2026-08-16T09:00:00.000Z',
        lastAttemptAt: '2026-08-16T09:55:00.000Z',
      }),
    );
    repository.save(
      telemetry('slow-free', {
        attemptCount: 3,
        successCount: 7,
        failureCount: 3,
        consecutiveFailures: 1,
        averageLatencyMilliseconds: 800,
        lastSuccessAt: '2026-08-16T09:30:00.000Z',
        lastAttemptAt: '2026-08-16T09:40:00.000Z',
      }),
    );
    const governor = new AgentRouteGovernor(repository, { now: () => now });
    const routes = [
      target('fast-paid', 'paid', 3, 'agent', 90),
      target('slow-free', 'free-tier', 2, 'agent', 70),
      target('local', 'local', 1, 'agent', 40),
    ];

    // act
    const actual = ids(governor.order(withStrategy(routes, 'priority')));

    // assert
    expect(actual).toEqual(['local', 'slow-free', 'fast-paid']);
    expect(ids(governor.order(withStrategy(routes, 'quality-first')))).toEqual([
      'fast-paid',
      'slow-free',
      'local',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'last-known-good')))).toEqual([
      'slow-free',
      'fast-paid',
      'local',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'lowest-cost')))).toEqual([
      'local',
      'slow-free',
      'fast-paid',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'lowest-latency')))).toEqual([
      'fast-paid',
      'slow-free',
      'local',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'most-reliable')))).toEqual([
      'local',
      'fast-paid',
      'slow-free',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'least-used')))).toEqual([
      'local',
      'slow-free',
      'fast-paid',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'reset-aware')))).toEqual([
      'local',
      'fast-paid',
      'slow-free',
    ]);
    expect(ids(governor.order(withStrategy(routes, 'balanced')))).toEqual([
      'local',
      'fast-paid',
      'slow-free',
    ]);
  });

  it('opens a circuit after repeated failures and admits a half-open probe after cooldown', () => {
    // arrange
    const repository = new MemoryTelemetryRepository();
    let now = new Date('2026-08-16T10:00:00.000Z');
    const governor = new AgentRouteGovernor(repository, {
      now: () => now,
      failureThreshold: 2,
      cooldownMilliseconds: 60_000,
    });
    const primary = target('primary', 'subscription-included', 1);
    const fallback = target('fallback', 'free-tier', 2);

    governor.recordAttempt(primary);
    governor.recordFailure(primary, 500);
    governor.recordAttempt(primary);
    // act
    governor.recordFailure(primary, 700);

    // assert
    expect(ids(governor.order([primary, fallback]))).toEqual(['fallback']);
    expect(() => governor.order([primary])).toThrow(AgentRoutesCoolingDownError);

    now = new Date('2026-08-16T10:01:00.001Z');
    expect(ids(governor.order([primary, fallback]))).toEqual(['primary', 'fallback']);
    governor.recordAttempt(primary);
    governor.recordSuccess(primary, 100);
    expect(repository.load('workspace', 'primary')).toMatchObject({
      attemptCount: 3,
      successCount: 1,
      failureCount: 2,
      consecutiveFailures: 0,
      circuitOpenUntil: undefined,
    });
  });

  it('keeps agent fallback order unless an eligible session-affine candidate is resumed', () => {
    // arrange
    const governor = new AgentRouteGovernor();
    const primary = target('primary', 'paid', 1, 'primary-agent');
    const priorFallback = target('prior-fallback', 'free-tier', 1, 'fallback-agent');

    // act
    const actual = ids(governor.order([primary, priorFallback]));

    // assert
    expect(actual).toEqual(['primary', 'prior-fallback']);
    expect(ids(governor.order([primary, priorFallback], 'prior-fallback'))).toEqual([
      'prior-fallback',
      'primary',
    ]);
  });

  it('opens one workspace provider circuit across separate account candidates', () => {
    // arrange
    const repository = new MemoryTelemetryRepository();
    let now = new Date('2026-08-16T10:00:00.000Z');
    const governor = new AgentRouteGovernor(repository, {
      now: () => now,
      failureThreshold: 2,
      cooldownMilliseconds: 60_000,
    });
    const first = withProvider(target('provider-account-a', 'paid', 1), 'upstream');
    const second = withProvider(target('provider-account-b', 'paid', 2), 'upstream');
    const independent = withProvider(target('independent', 'paid', 3), 'other-provider');

    governor.recordAttempt(first);
    governor.recordFailure(first, 100);
    governor.recordAttempt(second);
    // act
    governor.recordFailure(second, 100);

    // assert
    expect(ids(governor.order([first, second, independent]))).toEqual(['independent']);
    now = new Date('2026-08-16T10:01:00.001Z');
    expect(ids(governor.order([first, second, independent]))).toEqual([
      'provider-account-a',
      'provider-account-b',
      'independent',
    ]);
  });

  it('keeps in-process route memory when persistence is temporarily unavailable', () => {
    // arrange
    const persistenceErrors: unknown[] = [];
    const repository: IAgentRouteTelemetryRepository = {
      initialize() {},
      load() {
        throw new Error('SQLite unavailable.');
      },
      save() {
        throw new Error('SQLite unavailable.');
      },
      removeWorkspace() {
        throw new Error('SQLite unavailable.');
      },
    };
    const governor = new AgentRouteGovernor(repository, {
      onPersistenceError: (cause) => persistenceErrors.push(cause),
    });
    // act
    const route = target('candidate', 'paid', 1);

    // assert
    expect(() => {
      governor.recordAttempt(route);
      governor.recordSuccess(route, 120);
      governor.removeWorkspace('other-workspace');
    }).not.toThrow();
    expect(ids(governor.order(withStrategy([route], 'last-known-good')))).toEqual(['candidate']);
    expect(persistenceErrors).toHaveLength(4);
  });

  it('keeps a healthy account available when two sibling accounts report capacity failures', () => {
    // arrange
    const repository = new MemoryTelemetryRepository();
    const governor = new AgentRouteGovernor(repository, { failureThreshold: 2 });
    const first = withProvider(target('exhausted-a', 'paid', 1), 'upstream');
    const second = withProvider(target('exhausted-b', 'paid', 2), 'upstream');
    const healthy = withProvider(target('healthy', 'paid', 3), 'upstream');

    // act
    governor.recordAttempt(first);
    governor.recordFailure(first, 100, false);
    governor.recordAttempt(second);
    governor.recordFailure(second, 100, false);

    // assert
    expect(ids(governor.order([healthy]))).toEqual(['healthy']);
    expect(repository.load('workspace', 'provider:upstream')).toMatchObject({
      failureCount: 0,
      consecutiveFailures: 0,
    });
    expect(repository.load('workspace', 'exhausted-a')).toMatchObject({ failureCount: 1 });
    expect(repository.load('workspace', 'exhausted-b')).toMatchObject({ failureCount: 1 });
  });
});

class MemoryTelemetryRepository implements IAgentRouteTelemetryRepository {
  // #region Fields

  private readonly _records = new Map<string, IAgentRouteTelemetry>();

  // #endregion

  // #region Methods

  public initialize(): void {}

  public load(workspaceId: string, routeCandidateId: string): IAgentRouteTelemetry | undefined {
    return this._records.get(`${workspaceId}:${routeCandidateId}`);
  }

  public save(record: IAgentRouteTelemetry): void {
    this._records.set(`${record.workspaceId}:${record.routeCandidateId}`, record);
  }

  public removeWorkspace(workspaceId: string): void {
    for (const [key, record] of this._records) {
      if (record.workspaceId === workspaceId) this._records.delete(key);
    }
  }

  // #endregion
}

function target(
  routeCandidateId: string,
  costClass: AgentRouteCostClass,
  priority: number,
  agentProfileId = 'agent',
  qualityScore = 50,
): IAgentRouteDescriptor {
  return {
    routing: {
      workspaceId: 'workspace',
      agentProfileId,
      routePolicyId: 'route-policy',
      routeCandidateId,
      strategy: 'priority',
      costClass,
      qualityScore,
      priority,
      sessionAffinity: true,
      maxParallelExecutions: 1,
    },
  };
}

function withProvider(route: IAgentRouteDescriptor, providerId: string): IAgentRouteDescriptor {
  return { routing: { ...route.routing, providerId } };
}

function withStrategy(
  targets: readonly IAgentRouteDescriptor[],
  strategy: AgentRouteStrategy,
): readonly IAgentRouteDescriptor[] {
  return targets.map((candidate) => ({
    routing: { ...candidate.routing, strategy },
  }));
}

function ids(targets: readonly IAgentRouteDescriptor[]): readonly string[] {
  return targets.map((candidate) => candidate.routing.routeCandidateId);
}

function telemetry(
  routeCandidateId: string,
  overrides: Partial<IAgentRouteTelemetry> = {},
): IAgentRouteTelemetry {
  return {
    workspaceId: 'workspace',
    routeCandidateId,
    attemptCount: 1,
    successCount: 1,
    failureCount: 0,
    consecutiveFailures: 0,
    ...overrides,
  };
}
