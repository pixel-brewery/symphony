// #region Imports

import { inject, Injectable } from '@angular/core';
import { BROWSER_STORAGE } from '../storage/BrowserStorageToken';

// #endregion

const STORAGE_PREFIX = 'symphony.pane.';

/**
 * Remembers the sizes the user dragged resizable panes to, per pane, on this device.
 *
 * The sizes are a convenience of the window layout, so a missing, full or blocked storage only
 * costs the remembered size and panes open at their default size.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class PaneSizeMemory {
  // #region Fields

  private readonly _storage = inject(BROWSER_STORAGE);

  // #endregion

  // #region Methods

  /**
   * Reads the remembered size of a pane.
   *
   * @param pane - Name of the pane.
   * @returns The size in whole pixels, or `undefined` while the user has not resized the pane.
   * @public
   */
  public read(pane: string): number | undefined {
    let stored: string | null | undefined;
    try {
      stored = this._storage?.getItem(STORAGE_PREFIX + pane);
    } catch {
      return undefined;
    }
    const size = stored && /^\d+$/.test(stored) ? Number.parseInt(stored, 10) : Number.NaN;
    return size > 0 ? size : undefined;
  }

  /**
   * Remembers the size a pane was dragged to.
   *
   * @param pane - Name of the pane.
   * @param size - Size in pixels; sizes that are not positive are ignored.
   * @public
   */
  public remember(pane: string, size: number): void {
    const pixels = Math.round(size);
    if (!Number.isFinite(pixels) || pixels <= 0) return;
    try {
      this._storage?.setItem(STORAGE_PREFIX + pane, String(pixels));
    } catch {
      // A full or blocked storage only costs the remembered size.
    }
  }

  // #endregion
}
