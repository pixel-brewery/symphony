// #region Imports

import { Injectable } from '@angular/core';
import type { Command } from './Command';

// #endregion

/**
 * Resolves commands registered under stable application names.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class CommandProxy {
  // #region Fields

  private readonly _commands = new Map<string, Command<never>>();

  // #endregion

  // #region Properties

  /**
   * All currently registered named commands.
   *
   * @public
   * @readonly
   */
  public get commands(): ReadonlyMap<string, Command<never>> {
    return this._commands;
  }

  // #endregion

  // #region Methods

  /**
   * Registers or replaces a named command.
   *
   * @param name - Stable command name.
   * @param command - Command resolved for that name.
   * @public
   */
  public registerNamed(name: string, command: Command<never>): void {
    this._commands.set(name, command);
  }

  /**
   * Resolves a previously registered command.
   *
   * @param name - Stable command name.
   * @returns The registered command.
   * @throws When no command owns the requested name.
   * @public
   */
  public resolve(name: string): Command<never> {
    const command = this._commands.get(name);
    if (!command) throw new Error(`No command is registered as "${name}".`);
    return command;
  }

  // #endregion
}
