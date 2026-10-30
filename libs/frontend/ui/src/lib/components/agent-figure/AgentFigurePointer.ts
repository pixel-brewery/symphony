// #region Imports

import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

// #endregion

/** One frame-throttled pointer listener shared by all visible employees. @public */
@Injectable({ providedIn: 'root' })
export class AgentFigurePointer {
  // #region Fields

  /** Viewport coordinates for FLAMOX-compatible look selection. @public */
  public readonly target = signal<Readonly<{ x: number; y: number }> | null>(null);
  private readonly _document = inject(DOCUMENT);
  private readonly _destroy = inject(DestroyRef);

  // #endregion

  // #region Ctor

  /** Installs one listener and releases it with the renderer. @public */
  public constructor() {
    const browser = this._document.defaultView;
    if (!browser) return;
    let frame: number | undefined;
    let pending: Readonly<{ x: number; y: number }> | null = null;
    const move = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      pending = { x: event.clientX, y: event.clientY };
      frame ??= browser.requestAnimationFrame(() => {
        frame = undefined;
        this.target.set(pending);
      });
    };
    const leave = (): void => {
      pending = null;
      this.target.set(null);
    };
    this._document.addEventListener('pointermove', move, { passive: true });
    this._document.addEventListener('pointerleave', leave);
    browser.addEventListener('blur', leave);
    this._destroy.onDestroy(() => {
      if (frame !== undefined) browser.cancelAnimationFrame(frame);
      this._document.removeEventListener('pointermove', move);
      this._document.removeEventListener('pointerleave', leave);
      browser.removeEventListener('blur', leave);
    });
  }

  // #endregion
}
