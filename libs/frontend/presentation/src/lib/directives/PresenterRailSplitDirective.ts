// #region Imports

import { Directive, inject, OnDestroy } from '@angular/core';
import { SplitComponent } from '@pixel-brewery/mosaik-elements-angular';
import type { SplitElement } from '@pixel-brewery/mosaik-elements-foundation';

// #endregion

/** Keeps the route surface visible while allowing only the workspace rail to collapse. */
@Directive({
  selector: 'mosaik-split[symphonyPresenterRailSplit]',
})
export class PresenterRailSplitDirective implements OnDestroy {
  // #region Fields

  private readonly _element: SplitElement = inject(SplitComponent).elementRef.nativeElement;

  private readonly _splitRepositionListener: EventListener = (event) =>
    this.onSplitReposition(event);
  private readonly _doubleClickListener: EventListener = (event) => this.onDoubleClick(event);
  private readonly _keyDownListener: EventListener = (event) => this.onKeyDown(event);

  // #endregion

  // #region Ctor

  public constructor() {
    this._element.addEventListener('splitReposition', this._splitRepositionListener);
    this._element.addEventListener('dblclick', this._doubleClickListener, { capture: true });
    this._element.addEventListener('keydown', this._keyDownListener, { capture: true });
  }

  // #endregion

  // #region Methods

  /**
   * Angular lifecycle hook invoked on destroy.
   *
   * @public
   */
  public ngOnDestroy(): void {
    this._element.removeEventListener('splitReposition', this._splitRepositionListener);
    this._element.removeEventListener('dblclick', this._doubleClickListener, { capture: true });
    this._element.removeEventListener('keydown', this._keyDownListener, { capture: true });
  }

  private onDoubleClick(event: Event): void {
    if (
      this._element.disabled ||
      !this._element.collapsible ||
      this._element.isCollapsed ||
      this._element.positionPercentage > 50
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this._element.collapse('end');
  }

  private onKeyDown(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Home' || this._element.isEndCollapsed) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private onSplitReposition(event: Event): void {
    const position = (event as CustomEvent<{ position?: unknown }>).detail?.position;
    if (position !== 0) return;
    this._element.expand('start');
  }

  // #endregion
}
