// #region Imports

import { computed, signal, type Signal, type WritableSignal } from '@angular/core';
import type { LoadingRef } from '../presentation/LoadingRef';

// #endregion

/**
 * A non-reentrant asynchronous command exposed by a ViewPresenter.
 *
 * @typeParam TParameter - Parameter supplied by the bound view event.
 * @public
 */
export class AsyncCommand<TParameter = void> {
  // #region Fields

  private readonly _execute: (parameter: TParameter) => Promise<void>;
  private readonly _loadingRef?: LoadingRef;
  private readonly _isExecuting: WritableSignal<boolean> = signal(false);
  private readonly _canExecute: Signal<boolean>;

  // #endregion

  // #region Ctor

  /**
   * Constructs an asynchronous command.
   *
   * @param execute - Asynchronous handler invoked when execution is allowed.
   * @param canExecute - Optional signal that gates execution.
   * @param loadingOwner - Optional loading reference or ViewPresenter supplying one.
   * @public
   */
  public constructor(
    execute: (parameter: TParameter) => Promise<void>,
    canExecute?: Signal<boolean>,
    loadingOwner?: LoadingRef | { readonly loadingRef: LoadingRef },
  ) {
    this._execute = execute;
    this._loadingRef = loadingOwner
      ? 'loadingRef' in loadingOwner
        ? loadingOwner.loadingRef
        : loadingOwner
      : undefined;
    this._canExecute = computed(() => (canExecute?.() ?? true) && !this._isExecuting());
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

  /**
   * Whether the asynchronous handler is currently running.
   *
   * @public
   * @readonly
   */
  public get isExecuting(): Signal<boolean> {
    return this._isExecuting.asReadonly();
  }

  // #endregion

  // #region Methods

  /**
   * Starts the command when execution is currently allowed.
   *
   * @param parameter - Parameter supplied by the view.
   * @public
   */
  public execute(parameter: TParameter): void {
    if (!this._canExecute()) return;
    this._isExecuting.set(true);
    this._loadingRef?.enter();
    void this.run(parameter);
  }

  private async run(parameter: TParameter): Promise<void> {
    try {
      await this._execute(parameter);
    } catch {
      // Command handlers own user-facing error reporting; rejected promises must not escape
      // a fire-and-forget view event as an unhandled rejection.
    } finally {
      this._loadingRef?.leave();
      this._isExecuting.set(false);
    }
  }

  // #endregion
}
