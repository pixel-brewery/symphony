// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { Command } from './Command';
import { CommandProxy } from './CommandProxy';

// #endregion

describe('CommandProxy', () => {
  it('resolves the command registered under a stable name', () => {
    // arrange
    const proxy = new CommandProxy();
    const command = new Command(vi.fn());
    proxy.registerNamed('workspace.refresh', command);

    // act
    const resolved = proxy.resolve('workspace.refresh');

    // assert
    expect(resolved).toBe(command);
  });

  it('fails explicitly for an unknown command name', () => {
    // arrange
    const proxy = new CommandProxy();

    // act
    const resolve = (): Command<never> => proxy.resolve('workspace.missing');

    // assert
    expect(resolve).toThrow('No command is registered as "workspace.missing".');
  });
});
