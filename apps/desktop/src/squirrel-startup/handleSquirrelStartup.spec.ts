// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { handleSquirrelStartup } from './';

// #endregion

describe('handleSquirrelStartup', () => {
  it('quits after the native update helper completes', () => {
    // arrange
    const quit = vi.fn();
    const listeners = new Map<string, () => void>();
    const spawnUpdate = vi.fn(() => ({
      once: (event: string, listener: () => void) => {
        listeners.set(event, listener);
        return undefined as never;
      },
    }));

    // act
    const actual = handleSquirrelStartup({
      platform: 'win32',
      command: '--squirrel-install',
      execPath: 'C:\\Users\\Example\\AppData\\Local\\Symphony\\app-0.1.0\\Symphony.exe',
      quit,
      spawnUpdate,
    });

    // assert
    expect(actual).toBe(true);
    expect(spawnUpdate).toHaveBeenCalledWith(
      'C:\\Users\\Example\\AppData\\Local\\Symphony\\Update.exe',
      ['--createShortcut=Symphony.exe'],
    );
    expect(quit).not.toHaveBeenCalled();

    listeners.get('close')?.();
    listeners.get('error')?.();
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it('handles obsolete applications without spawning Update.exe', () => {
    // arrange
    const quit = vi.fn();
    const spawnUpdate = vi.fn();

    // act
    const actual = handleSquirrelStartup({
      platform: 'win32',
      command: '--squirrel-obsolete',
      execPath: 'C:\\Symphony.exe',
      quit,
      spawnUpdate,
    });

    // assert
    expect(actual).toBe(true);
    expect(quit).toHaveBeenCalledOnce();
    expect(spawnUpdate).not.toHaveBeenCalled();
  });
});
