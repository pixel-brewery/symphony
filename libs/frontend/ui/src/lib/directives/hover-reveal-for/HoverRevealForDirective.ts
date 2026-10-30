// #region Imports

import {
  AfterViewInit,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  Renderer2,
} from '@angular/core';
import type { HoverRevealTarget } from './HoverRevealTarget';
import type { IHasElementRef } from './IHasElementRef';

// #endregion

/** Keeps a contextual control in layout while revealing it for pointer and keyboard interaction. */
@Directive({
  selector: '[symphonyHoverRevealFor]',
  exportAs: 'symphonyHoverRevealFor',
})
export class HoverRevealForDirective implements OnInit, AfterViewInit {
  // #region Fields

  /**
   * The for.
   *
   * @public
   * @readonly
   */
  public readonly for = input<HoverRevealTarget>(null, { alias: 'symphonyHoverRevealFor' });
  private readonly _renderer = inject(Renderer2);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly _destroyRef = inject(DestroyRef);
  private _cleanups: Array<() => void> = [];
  private _isPointerWithin = false;
  private _hasFocusWithin = false;

  // #endregion

  // #region Ctor

  public constructor() {
    this._destroyRef.onDestroy(() => this.unbind());
    effect(() => this.rebind(this.for()));
  }

  // #endregion

  // #region Methods

  /**
   * Angular lifecycle hook invoked on init.
   *
   * @public
   */
  public ngOnInit(): void {
    this.updateVisibility();
  }

  /**
   * Angular lifecycle hook invoked after view init.
   *
   * @public
   */
  public ngAfterViewInit(): void {
    this.rebind(this.for());
  }

  private rebind(target: HoverRevealTarget): void {
    this.unbind();
    const element = this.resolveElement(target);
    if (!element) return;

    this._cleanups = [
      this._renderer.listen(element, 'mouseenter', () => {
        this._isPointerWithin = true;
        this.updateVisibility();
      }),
      this._renderer.listen(element, 'mouseleave', () => {
        this._isPointerWithin = false;
        this.updateVisibility();
      }),
      this._renderer.listen(element, 'focusin', () => {
        this._hasFocusWithin = true;
        this.updateVisibility();
      }),
      this._renderer.listen(element, 'focusout', (event: FocusEvent) => {
        if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
        this._hasFocusWithin = false;
        this.updateVisibility();
      }),
    ];
  }

  private resolveElement(target: HoverRevealTarget): HTMLElement | null {
    if (!target) return null;
    if (target instanceof HTMLElement) return target;
    if (target instanceof ElementRef) return target.nativeElement;
    return this.hasElementRef(target) ? target.elementRef.nativeElement : null;
  }

  private hasElementRef(target: unknown): target is IHasElementRef {
    return (
      target !== null &&
      typeof target === 'object' &&
      'elementRef' in target &&
      target.elementRef instanceof ElementRef
    );
  }

  private updateVisibility(): void {
    const visible = this._isPointerWithin || this._hasFocusWithin;
    this._renderer.setStyle(this._host, 'opacity', visible ? '1' : '0');
    this._renderer.setStyle(this._host, 'pointer-events', visible ? 'auto' : 'none');
  }

  private unbind(): void {
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this._isPointerWithin = false;
    this._hasFocusWithin = false;
    this.updateVisibility();
  }

  // #endregion
}
