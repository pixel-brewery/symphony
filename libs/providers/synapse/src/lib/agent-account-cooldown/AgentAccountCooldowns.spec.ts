// #region Imports

import { describe, expect, it } from 'vitest';
import type { IAgentAccountCooldown } from '@symphony/domain-ai';
import type { IAgentAccountCooldownRepository } from '@symphony/application-ai';
import { AgentAccountCapacityError } from './AgentAccountCapacityError';
import { AgentAccountCooldowns } from './AgentAccountCooldowns';
import { agentAccountCapacityErrorFor } from './agentAccountCapacityErrorFor';
import { parseAgentRetryAt } from './parseAgentRetryAt';

// #endregion

describe('AgentAccountCooldowns', () => {
  it('classifies explicit account quota and trusted generic rate limits with reset hints', () => {
    // arrange
    const now = new Date('2026-08-16T10:00:00.000Z');
    const quota = agentAccountCapacityErrorFor(
      'Account usage quota exhausted. Resets in 2 hours.',
      { now },
    );
    const untrustedRateLimit = agentAccountCapacityErrorFor(
      'HTTP 429 rate limited. Retry after 30 seconds.',
      { now },
    );
    // act
    const trustedRateLimit = agentAccountCapacityErrorFor(
      'HTTP 429 rate limited. Retry after 30 seconds.',
      { includeGenericRateLimit: true, now },
    );

    // assert
    expect(quota).toMatchObject({
      reason: 'quota-exhausted',
      retryAt: '2026-08-16T12:00:00.000Z',
    });
    expect(untrustedRateLimit).toBeUndefined();
    expect(trustedRateLimit).toMatchObject({
      reason: 'rate-limited',
      retryAt: '2026-08-16T10:00:30.000Z',
    });
    expect(parseAgentRetryAt('Retry at 2026-08-17T08:30:00Z.', now)).toBe(
      '2026-08-17T08:30:00.000Z',
    );
    expect(
      agentAccountCapacityErrorFor("You've hit your limit · resets later", {
        includeGenericRateLimit: true,
        now,
      }),
    ).toMatchObject({ reason: 'quota-exhausted' });
    expect(agentAccountCapacityErrorFor('insufficient_quota', { now })).toMatchObject({
      reason: 'quota-exhausted',
    });
    expect(
      agentAccountCapacityErrorFor('rate_limit_error', {
        includeGenericRateLimit: true,
        now,
      }),
    ).toMatchObject({ reason: 'rate-limited' });
    expect(
      agentAccountCapacityErrorFor('Model quota exhausted.', {
        requireAccountScope: true,
        now,
      }),
    ).toBeUndefined();
    expect(
      agentAccountCapacityErrorFor('Account quota exhausted.', {
        requireAccountScope: true,
        now,
      }),
    ).toMatchObject({ reason: 'quota-exhausted' });
    expect(parseAgentRetryAt('Retry-After: 45', now)).toBe('2026-08-16T10:00:45.000Z');
  });

  it('shares a cooldown across routes of one account without crossing a workspace or account', () => {
    // arrange
    const repository = new MemoryAccountCooldownRepository();
    const cooldowns = new AgentAccountCooldowns(repository, {
      now: () => new Date('2026-08-16T10:00:00.000Z'),
    });
    const accountA = target('workspace-a', 'account-a');
    const cooldown = cooldowns.recordFailure(
      accountA,
      new AgentAccountCapacityError('Quota exhausted.', {
        reason: 'quota-exhausted',
        retryAt: '2026-08-16T11:00:00.000Z',
      }),
    );

    // act
    const actual = cooldowns.active({ ...accountA, label: 'Another route' });

    // assert
    expect(actual).toEqual(cooldown);
    expect(cooldowns.active(target('workspace-a', 'account-b'))).toBeUndefined();
    expect(cooldowns.active(target('workspace-b', 'account-a'))).toBeUndefined();
  });

  it('expires persisted cooldowns and keeps in-process protection when persistence fails', () => {
    // arrange
    let now = new Date('2026-08-16T10:00:00.000Z');
    const failures: unknown[] = [];
    const repository: IAgentAccountCooldownRepository = {
      loadAccountCooldown() {
        throw new Error('SQLite unavailable.');
      },
      saveAccountCooldown() {
        throw new Error('SQLite unavailable.');
      },
      clearAccountCooldown() {
        throw new Error('SQLite unavailable.');
      },
      clearWorkspaceAccountCooldowns() {
        throw new Error('SQLite unavailable.');
      },
    };
    const cooldowns = new AgentAccountCooldowns(repository, {
      now: () => now,
      rateLimitCooldownMilliseconds: 1_000,
      onPersistenceError: (cause) => failures.push(cause),
    });
    const account = target('workspace-a', 'account-a');
    // act
    cooldowns.recordFailure(
      account,
      new AgentAccountCapacityError('Rate limited.', { reason: 'rate-limited' }),
    );

    // assert
    expect(cooldowns.active(account)).toMatchObject({ reason: 'rate-limited' });
    now = new Date('2026-08-16T10:00:01.001Z');
    expect(cooldowns.active(account)).toBeUndefined();
    expect(cooldowns.active(target('workspace-a', 'account-b'))).toBeUndefined();
    expect(failures).toHaveLength(3);
  });
});

class MemoryAccountCooldownRepository implements IAgentAccountCooldownRepository {
  // #region Fields

  private readonly _records = new Map<string, IAgentAccountCooldown>();

  // #endregion

  // #region Methods

  public loadAccountCooldown(
    workspaceId: string,
    aiConnectionId: string,
  ): IAgentAccountCooldown | undefined {
    return this._records.get(`${workspaceId}:${aiConnectionId}`);
  }

  public saveAccountCooldown(cooldown: IAgentAccountCooldown): void {
    this._records.set(`${cooldown.workspaceId}:${cooldown.aiConnectionId}`, cooldown);
  }

  public clearAccountCooldown(workspaceId: string, aiConnectionId: string): void {
    this._records.delete(`${workspaceId}:${aiConnectionId}`);
  }

  public clearWorkspaceAccountCooldowns(workspaceId: string): void {
    for (const [key, cooldown] of this._records) {
      if (cooldown.workspaceId === workspaceId) this._records.delete(key);
    }
  }

  // #endregion
}

function target(workspaceId: string, aiConnectionId: string) {
  return { workspaceId, aiConnectionId, label: `${workspaceId}/${aiConnectionId}` };
}
