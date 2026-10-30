// #region Imports

import { Directive, effect, forwardRef, input } from '@angular/core';
import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import { DynamicSizeVirtualScrollStrategy } from './DynamicSizeVirtualScrollStrategy';

// #endregion

/**
 * Provides dynamic-height virtualization to a CDK viewport.
 *
 * @public
 */
@Directive({
  selector: 'cdk-virtual-scroll-viewport[symphonyDynamicSizeVirtualScroll]',
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useExisting: forwardRef(() => DynamicSizeVirtualScrollDirective),
    },
  ],
})
export class DynamicSizeVirtualScrollDirective extends DynamicSizeVirtualScrollStrategy {
  // #region Fields

  /**
   * Stable keys in the same order as the viewport data.
   *
   * @public
   * @readonly
   */
  public readonly keys = input.required<readonly string[]>({
    alias: 'symphonyDynamicSizeVirtualScroll',
  });

  /**
   * Initial height used for entries that have not been measured yet.
   *
   * @public
   * @readonly
   */
  public readonly estimatedItemSize = input(240);

  /**
   * Pixel overscan rendered before and after the visible viewport.
   *
   * @public
   * @readonly
   */
  public readonly bufferSize = input(720);

  // #endregion

  // #region Ctor

  public constructor() {
    super();
    effect(() => this.update(this.keys(), this.estimatedItemSize(), this.bufferSize()));
  }

  // #endregion
}
