// #region Imports

import { computed, type Signal } from '@angular/core';

// #endregion

type CommandParameters<TParameter> = undefined extends TParameter
  ? [parameter?: TParameter]
  : [parameter: TParameter];

/**
 * A user action exposed by a ViewPresenter together with its current executability.
 *
 * @typeParam TParameter - Parameter supplied by the bound view event.
 * @public
 */
export class Command<TParameter = void> {
  // #region Fields

  private readonly _execute: (parameter: TParameter) => void;
  private readonly _canExecute: Signal<boolean>;

  // #endregion

  // #region Ctor

  /**
   * Constructs a command.
   *
   * @param execute - Handler invoked when execution is allowed.
   * @param canExecute - Optional signal that gates execution.
   * @public
   */
  public constructor(execute: (parameter: TParameter) => void, canExecute?: Signal<boolean>) {
    this._execute = execute;
    this._canExecute = computed(() => canExecute?.() ?? true);
  }

  // #endregion

  // #region Properties

  /**
   * Whether the command may currently execute.
   *
   * @public
   * @readonly
   */
  public get canExecute(): Signal<boolean> {
    return this._canExecute;
  }

  // #endregion

  // #region Methods

  /**
   * Executes the command when it is currently allowed.
   *
   * @param parameter - Parameter supplied by the view.
   * @public
   */
  public execute(...parameters: CommandParameters<TParameter>): void {
    if (this._canExecute()) this._execute(parameters[0] as TParameter);
  }

  // #endregion
}
