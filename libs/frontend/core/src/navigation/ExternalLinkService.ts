// #region Imports

import { DOCUMENT } from '@angular/common';
import { Inject, inject, Injectable } from '@angular/core';

// #endregion

/**
 * Opens an external URL from a command context (menus, shortcuts) where no rendered link exists.
 * The desktop main process intercepts the window-open request and hands it to the OS browser.
 * Rendered links keep using `mosaik-anchor` / `mosaik-button [href]` with `target="_blank"`.
 */
@Injectable({ providedIn: 'root' })
export class ExternalLinkService {
  // #region Fields

  private readonly _document: Document;

  // #endregion

  // #region Ctor

  /**
   * Constructs the external-navigation adapter.
   *
   * @public
   */
  public constructor(@Inject(DOCUMENT) document: Document = inject(DOCUMENT)) {
    this._document = document;
  }

  // #endregion

  // #region Methods

  /**
   * Opens.
   *
   * @param url - Url.
   * @public
   */
  public open(url: string | undefined): void {
    if (!url) return;
    this._document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
  }

  // #endregion
}
