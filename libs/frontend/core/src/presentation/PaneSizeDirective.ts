// #region Imports

import { afterRenderEffect, Directive, ElementRef, inject, input, untracked } from '@angular/core';
import { PaneSizeMemory } from './PaneSizeMemory';

// #endregion

interface IPaneSplitElement extends HTMLElement {
  position: string;
  readonly positionInPixels: number;
  readonly updateComplete?: Promise<unknown>;
}

/**
 * Remembers the size of the resizable pane of a `mosaik-split`.
 *
 * The split's primary pane (the start pane, or the end pane with `lock="end"`) opens at the size
 * the user last dragged it to, and at `paneSize` until then. The size includes the divider, as the
 * artboards draw a pane with its hairline: a 240px sidebar is 239px of content and the 1px line, so
 * the next pane starts at 240px. The split itself keeps owning `min`, `max`, `lock` and the drag
 * interaction:
 *
 * ```html
 * <mosaik-split symphonyPaneSize="inbox.list" [paneSize]="400" [lock]="'start'" [min]="'280px'">
 *   <aside slot="start">…</aside>
 *   <main slot="end">…</main>
 * </mosaik-split>
 * ```
 *
 * @public
 */
@Directive({
  selector: 'mosaik-split[symphonyPaneSize]',
  standalone: true,
  host: { '(splitReposition)': 'persist()' },
})
export class PaneSizeDirective {
  // #region Fields

  private readonly _element = inject<ElementRef<IPaneSplitElement>>(ElementRef).nativeElement;
  private readonly _memory = inject(PaneSizeMemory);
  private _applied = false;

  // #endregion

  // #region Ctor

  /**
   * Opens the pane at its remembered size once the bindings of the split are applied and the split
   * has measured itself.
   *
   * @public
   */
  public constructor() {
    afterRenderEffect(() => {
      const key = this.symphonyPaneSize();
      const fallback = this.paneSize();
      untracked(() => {
        const size = this._memory.read(key) ?? fallback;
        this._applied = false;
        // The split measures itself once its first update completes; a size applied before that
        // resolves against a width of zero and leaves the pane collapsed.
        void (this._element.updateComplete ?? Promise.resolve()).then(() => {
          this._element.position = `${size - this.dividerWidth() / 2}px`;
          this._applied = true;
        });
      });
    });
  }

  // #endregion

  // #region Properties

  /**
   * Name under which the pane size is remembered, unique per split.
   *
   * @public
   * @readonly
   */
  public readonly symphonyPaneSize = input.required<string>();

  /**
   * Size of the primary pane including its divider, in pixels, until the user resizes it.
   *
   * @public
   * @readonly
   */
  public readonly paneSize = input.required<number>();

  // #endregion

  // #region Methods

  /**
   * Remembers where the user let go of the divider, in whole pixels; reopening puts the end of the
   * divider there.
   *
   * @protected
   */
  protected persist(): void {
    if (this._applied)
      this._memory.remember(this.symphonyPaneSize(), this._element.positionInPixels);
  }

  /**
   * The split centres its divider on `position`, so half of it belongs to each pane.
   */
  private dividerWidth(): number {
    const width = Number.parseFloat(
      getComputedStyle(this._element).getPropertyValue('--split-divider-width'),
    );
    return Number.isFinite(width) && width > 0 ? width : 0;
  }

  // #endregion
}
