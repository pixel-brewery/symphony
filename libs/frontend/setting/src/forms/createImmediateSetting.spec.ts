// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { createImmediateSetting } from './createImmediateSetting';

// #endregion

describe('createImmediateSetting', () => {
  it('shows the new value while it saves and keeps it once the stored value follows', async () => {
    // arrange
    const stored = signal(20);
    const setting = createImmediateSetting(() => stored());
    let during: number | undefined;
    let savingDuring = false;

    // act
    const saved = await setting.apply(32, async (next) => {
      during = setting.value();
      savingDuring = setting.saving();
      stored.set(next);
      return true;
    });

    // assert
    expect(saved).toBe(true);
    expect(during).toBe(32);
    expect(savingDuring).toBe(true);
    expect(setting.value()).toBe(32);
    expect(setting.saving()).toBe(false);
  });

  it('restores the previous value when saving fails', async () => {
    // arrange
    const stored = signal(true);
    const setting = createImmediateSetting(() => stored());

    // act
    const saved = await setting.apply(false, async () => false);

    // assert
    expect(saved).toBe(false);
    expect(setting.value()).toBe(true);
  });

  it('does not save a value equal to the stored one', async () => {
    // arrange
    const stored = signal('stable');
    const setting = createImmediateSetting(() => stored());
    const persist = vi.fn(async () => true);

    // act
    const saved = await setting.apply('stable', persist);

    // assert
    expect(saved).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
});
