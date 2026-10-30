// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveSquirrelStartupAction } from './';

// #endregion

describe('resolveSquirrelStartupAction', () => {
  it('ignores ordinary launches and every non-Windows platform', () => {
    // act
    const actual = resolveSquirrelStartupAction(
      'darwin',
      '--squirrel-install',
      '/Applications/Symphony',
    );

    // assert
    expect(actual).toBeUndefined();
    expect(
      resolveSquirrelStartupAction('win32', undefined, 'C:\\Users\\Example\\Symphony.exe'),
    ).toBeUndefined();
  });

  it.each([
    ['--squirrel-install', '--createShortcut=Symphony.exe'],
    ['--squirrel-updated', '--createShortcut=Symphony.exe'],
    ['--squirrel-uninstall', '--removeShortcut=Symphony.exe'],
  ])('maps %s to the native Update.exe action', (command, expectedArgument) => {
    // act
    const actual = resolveSquirrelStartupAction(
      'win32',
      command,
      'C:\\Users\\Example\\AppData\\Local\\Symphony\\app-0.1.0\\Symphony.exe',
    );

    // assert
    expect(actual).toEqual({
      kind: 'run-update',
      executable: 'C:\\Users\\Example\\AppData\\Local\\Symphony\\Update.exe',
      arguments: [expectedArgument],
    });
  });
});
