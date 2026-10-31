// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForRecoveryDelay } from './waitForRecoveryDelay';

// #endregion

afterEach(() => {
  vi.useRealTimers();
});

describe('waitForRecoveryDelay', () => {
  it('honors a provider retry window instead of hot-looping the durable execution', async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T10:00:00.000Z'));
    let completed = false;
    const waiting = waitForRecoveryDelay(
      2,
      new AbortController().signal,
      '2026-08-16T10:05:00.000Z',
    ).then(() => {
      completed = true;
    });

    // act
    await vi.advanceTimersByTimeAsync(299_999);
    // assert
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(completed).toBe(true);
  });

  it('remains abortable while waiting for a long account cooldown', async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T10:00:00.000Z'));
    const controller = new AbortController();
    const waiting = waitForRecoveryDelay(2, controller.signal, '2026-08-17T10:00:00.000Z');

    // act
    controller.abort();
    // assert
    await expect(waiting).rejects.toThrow('Recovery cancelled.');
  });
});
