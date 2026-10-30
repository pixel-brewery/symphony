// #region Imports

import { Directive, inject, Input, type OnInit } from '@angular/core';
import { CommandDirective } from './CommandDirective';
import { CommandProxy } from './CommandProxy';

// #endregion

/**
 * Resolves named commands into the event bindings owned by {@link CommandDirective}.
 *
 * @public
 */
@Directive({ selector: '[commandName]', standalone: true })
export class CommandNameDirective implements OnInit {
  // #region Fields

  private readonly _target: CommandDirective;
  private readonly _commandProxy: CommandProxy;
  private _commandName: Readonly<Record<string, string>> = {};

  // #endregion

  // #region Ctor

  /**
   * Constructs the named-command binding for its host command directive.
   *
   * @public
   */
  public constructor(
    target: CommandDirective = inject(CommandDirective, { self: true }),
    commandProxy: CommandProxy = inject(CommandProxy),
  ) {
    this._target = target;
    this._commandProxy = commandProxy;
  }

  // #endregion

  // #region Properties

  /**
   * Event names mapped to registered command names.
   *
   * @public
   */
  @Input('commandName')
  public get commandName(): Readonly<Record<string, string>> {
    return this._commandName;
  }

  /**
   * Replaces the event-to-command-name bindings.
   *
   * @param value - New named bindings.
   * @public
   */
  public set commandName(value: Readonly<Record<string, string>>) {
    this._commandName = value;
  }

  // #endregion

  // #region Methods

  /**
   * Resolves all declarative names before the host begins handling events.
   *
   * @public
   */
  public ngOnInit(): void {
    const bindings = Object.fromEntries(
      Object.entries(this._commandName).map(([eventName, commandName]) => [
        eventName,
        this._commandProxy.resolve(commandName),
      ]),
    );
    this._target.command.update((current) => ({ ...current, ...bindings }));
  }

  // #endregion
}
