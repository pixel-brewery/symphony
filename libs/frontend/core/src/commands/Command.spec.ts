// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { Command } from './Command';

// #endregion

describe('Command', () => {
  it('runs the action with the parameter supplied by the view', () => {
    // arrange
    const execute = vi.fn<(parameter: string) => void>();
    const command = new Command(execute);

    // act
    command.execute('work-item-1');

    // assert
    expect(execute).toHaveBeenCalledExactlyOnceWith('work-item-1');
  });

  it('is executable when no condition gates it', () => {
    // arrange
    const command = new Command(() => undefined);

    // act
    const actual = command.canExecute();

    // assert
    expect(actual).toBe(true);
  });

  it('passes undefined when an optional command parameter is omitted', () => {
    // arrange
    const execute = vi.fn<(parameter: string | undefined) => void>();
    const command = new Command<string | undefined>(execute);

    // act
    command.execute();

    // assert
    expect(execute).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('refuses to run while its condition is unmet', () => {
    // arrange
    const execute = vi.fn();
    const isEnabled = signal(false);
    const command = new Command<void>(execute, isEnabled);

    // act
    command.execute();

    // assert
    expect(command.canExecute()).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('runs again once its condition becomes true', () => {
    // arrange
    const execute = vi.fn();
    const isEnabled = signal(false);
    const command = new Command<void>(execute, isEnabled);
    command.execute();

    // act
    isEnabled.set(true);
    command.execute();

    // assert
    expect(command.canExecute()).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
  });
});
