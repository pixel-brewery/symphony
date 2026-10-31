// #region Imports

import { DOCUMENT } from '@angular/common';
import { Inject, inject, Injectable } from '@angular/core';

// #endregion

/**
 * Copies text to the system clipboard from a command context (menus, shortcuts).
 * The sandboxed renderer only has the asynchronous Clipboard API, and a rejected write is
 * indistinguishable from a successful one to the operator, so the outcome is reported back
 * instead of swallowed: the caller owns the confirmation the user sees.
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  // #region Fields

  private readonly _document: Document;

  // #endregion

  // #region Ctor

  /**
   * Constructs the clipboard adapter.
   *
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    this._document = document;
  }

  // #endregion

  // #region Methods

  /**
   * Returns the write text.
   *
   * @param text - Text.
   * @public
   */
  public async writeText(text: string | undefined): Promise<boolean> {
    if (!text) return false;
    const clipboard = this._document.defaultView?.navigator?.clipboard;
    if (!clipboard) return false;
    try {
      await clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // #endregion
}
