// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { AgentModelLockout } from './AgentModelLockout';

// #endregion

describe('AgentModelLockout', () => {
  it('does not inspect a provider when the route uses its account default model', async () => {
    // arrange
    const inspectModelAvailability = vi.fn(async () => ({ state: 'unavailable' as const }));
    // act
    const lockout = new AgentModelLockout();

    // assert
    await expect(
      lockout.inspect(target(null, inspectModelAvailability), new AbortController().signal),
    ).resolves.toEqual({ state: 'available' });
    expect(inspectModelAvailability).not.toHaveBeenCalled();
  });

  it('caches runtime evidence only for the exact workspace, account, and model', async () => {
    // arrange
    let now = 1_000;
    const inspectModelAvailability = vi.fn(async () => ({
      state: 'unavailable' as const,
      reason: 'Not entitled.',
    }));
    const lockout = new AgentModelLockout({
      now: () => now,
      unavailableCacheMilliseconds: 100,
    });
    const signal = new AbortController().signal;

    await lockout.inspect(target('model-a', inspectModelAvailability), signal);
    await lockout.inspect(target('model-a', inspectModelAvailability), signal);
    // act
    await lockout.inspect(
      { ...target('model-a', inspectModelAvailability), aiConnectionId: 'account-b' },
      signal,
    );
    // assert
    expect(inspectModelAvailability).toHaveBeenCalledTimes(2);

    now += 101;
    await lockout.inspect(target('model-a', inspectModelAvailability), signal);
    expect(inspectModelAvailability).toHaveBeenCalledTimes(3);
  });

  it('fails open on runtime inspection errors but propagates operator cancellation', async () => {
    // arrange
    const errors: unknown[] = [];
    const lockout = new AgentModelLockout({
      onInspectionError: (cause) => errors.push(cause),
    });
    // act
    const failingInspection = vi.fn(async () => {
      throw new Error('Runtime model list unavailable.');
    });

    // assert
    await expect(
      lockout.inspect(target('model-a', failingInspection), new AbortController().signal),
    ).resolves.toMatchObject({ state: 'unknown' });
    expect(errors).toHaveLength(1);

    const controller = new AbortController();
    controller.abort(new Error('Operator cancelled.'));
    await expect(
      lockout.inspect(target('model-b', failingInspection), controller.signal),
    ).rejects.toThrow('Operator cancelled.');
  });

  it('clears cached evidence only for the selected workspace account', async () => {
    // arrange
    const inspectModelAvailability = vi.fn(async () => ({ state: 'available' as const }));
    const lockout = new AgentModelLockout();
    const signal = new AbortController().signal;
    const accountA = target('model-a', inspectModelAvailability);
    const accountB = { ...accountA, aiConnectionId: 'account-b' };

    await lockout.inspect(accountA, signal);
    await lockout.inspect(accountB, signal);
    lockout.clearConnection(accountA.workspaceId, accountA.aiConnectionId);
    await lockout.inspect(accountA, signal);
    // act
    await lockout.inspect(accountB, signal);

    // assert
    expect(inspectModelAvailability).toHaveBeenCalledTimes(3);
  });
});

function target(
  model: string | null,
  inspectModelAvailability: NonNullable<
    Parameters<AgentModelLockout['inspect']>[0]['inspectModelAvailability']
  >,
) {
  return {
    workspaceId: 'workspace',
    aiConnectionId: 'account-a',
    model,
    inspectModelAvailability,
  };
}
