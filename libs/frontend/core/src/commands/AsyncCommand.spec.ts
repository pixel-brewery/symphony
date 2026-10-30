// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AsyncCommand } from './AsyncCommand';

// #endregion

describe('AsyncCommand', () => {
  it('blocks re-entry and balances the loading reference', async () => {
    // arrange
    let finish: (() => void) | undefined;
    const operation = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const execute = vi.fn(() => operation);
    const loadingRef = { enter: vi.fn(), leave: vi.fn() };
    const command = new AsyncCommand(execute, signal(true), loadingRef);

    // act
    command.execute();
    command.execute();
    finish?.();
    await operation;
    await Promise.resolve();

    // assert
    expect(execute).toHaveBeenCalledOnce();
    expect(loadingRef.enter).toHaveBeenCalledOnce();
    expect(loadingRef.leave).toHaveBeenCalledOnce();
    expect(command.isExecuting()).toBe(false);
  });
});
