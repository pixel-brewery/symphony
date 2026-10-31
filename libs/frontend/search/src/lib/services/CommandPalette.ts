// #region Imports

import { Injectable, signal, type Signal } from '@angular/core';

// #endregion

/**
 * Opens and closes the command palette, the ⌘K overlay that searches work items, pull requests
 * and commands. The window chrome owns the shortcut and the toolbar search field; the palette view
 * renders while `isOpen` is true.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class CommandPalette {
  // #region Fields

  private readonly _isOpen = signal(false);
  private readonly _query = signal('');

  // #endregion

  // #region Properties

  /**
   * Whether the palette is open.
   *
   * @public
   * @readonly
   */
  public get isOpen(): Signal<boolean> {
    return this._isOpen.asReadonly();
  }

  /**
   * Text the palette opened with, for example from the toolbar search field.
   *
   * @public
   * @readonly
   */
  public get initialQuery(): Signal<string> {
    return this._query.asReadonly();
  }

  // #endregion

  // #region Methods

  /**
   * Opens the palette.
   *
   * @param query - Optional text to start searching with.
   * @public
   */
  public open(query = ''): void {
    this._query.set(query);
    this._isOpen.set(true);
  }

  /**
   * Closes the palette.
   *
   * @public
   */
  public close(): void {
    this._isOpen.set(false);
    this._query.set('');
  }

  /**
   * Opens the palette when it is closed and closes it when it is open.
   *
   * @public
   */
  public toggle(): void {
    if (this._isOpen()) this.close();
    else this.open();
  }

  // #endregion
}
