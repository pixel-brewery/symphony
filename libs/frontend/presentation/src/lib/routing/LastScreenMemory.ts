// #region Imports

import { inject, Injectable } from '@angular/core';
import { BROWSER_STORAGE } from '@symphony/frontend-core';

// #endregion

const STORAGE_KEY = 'symphony.window.last-screen';
const SCREEN_PATH = /^\/main(?:\/(?!\.{1,2}(?:\/|$))[A-Za-z0-9._~-]+)+$/;
const SETTINGS_PATH = /^\/main\/(?:settings|projects)(?:\/|$)/;

/**
 * Remembers the last screen of the main window, so the app reopens where the user left it.
 *
 * Only the screen's path counts: query parameters open transient things such as the New Work Item
 * sheet or the notifications, and they are not restored. Settings is never remembered: it is a
 * detour of the main window, so quitting in Settings reopens the screen the user came from.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class LastScreenMemory {
  // #region Fields

  private readonly _storage = inject(BROWSER_STORAGE);

  // #endregion

  // #region Methods

  /**
   * Remembers the screen a navigation of the main window ended on.
   *
   * @param url - The URL after redirects.
   * @public
   */
  public remember(url: string): void {
    const path = toScreenPath(url);
    if (!path) return;
    try {
      this._storage?.setItem(STORAGE_KEY, path);
    } catch {
      // A full or blocked storage only costs reopening at the start page.
    }
  }

  /**
   * Reads the screen the main window showed last.
   *
   * @returns The path of the screen, or `undefined` before the first visit.
   * @public
   */
  public read(): string | undefined {
    try {
      const stored = this._storage?.getItem(STORAGE_KEY);
      return stored ? toScreenPath(stored) : undefined;
    } catch {
      return undefined;
    }
  }

  // #endregion
}

function toScreenPath(url: string): string | undefined {
  const path = url.split(/[?#]/, 1)[0] ?? '';
  return SCREEN_PATH.test(path) && !SETTINGS_PATH.test(path) ? path : undefined;
}
