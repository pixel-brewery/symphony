// #region Imports

import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  Renderer2,
  signal,
  WritableSignal,
} from '@angular/core';
import type { MagnificationAxis } from './MagnificationAxis';
import type { IMagnificationCell } from './pointerMagnification';
import { magnificationFalloff, magnificationPlacements } from './pointerMagnification';

// #endregion

interface IMeasuredCell {
  readonly element: HTMLElement;
  readonly cell: IMagnificationCell;
}

/**
 * Magnifies a row or column of elements around the pointer, the way the macOS Dock does: the
 * element under the cursor swells, its neighbours swell less, and everything else slides aside to
 * keep the gaps intact. It decorates whatever it is put on - the host is the track, its element
 * children are the cells - and never replaces, wraps or re-orders them.
 *
 * The effect is transform-only. Nothing is laid out again while the pointer moves: each cell gets
 * one `translate3d() scale()` write per animation frame, so the track's own box, and therefore
 * every box around it, is exactly what it is at rest. Children whose main-axis extent measures zero
 * are ignored, which is what keeps zero-box siblings - `display: contents` tooltip hosts, comment
 * anchors - out of the geometry. Children that do not match the item selector still take part: they
 * are displaced with the row but never grow, which is what a separator wants.
 *
 * Nothing here goes through change detection. The pointer is followed with passive listeners
 * registered off Angular's binding machinery and coalesced into a single animation frame, and the
 * only signals read on that path have been snapshotted into plain fields beforehand. The field
 * fades in over the last `magnificationApproach` pixels of the pointer's approach on the cross
 * axis, so there is no transition to fight and no timer to run: the enter, the follow and the leave
 * are all the same continuous function of where the pointer is.
 *
 * The host stylesheet owns the cross-axis anchor. The maths assumes the main-axis
 * `transform-origin` stays at 50%; a bottom-anchored dock therefore sets `transform-origin: 50%
 * 100%` on its items so the growth goes upward, and a track that magnifies about its centre needs
 * no rule at all. Growing cells overhang the track's own box by design - do not clip it.
 *
 * The effect removes itself entirely, rather than merely shortening, when the pointer is coarse or
 * hover is unavailable, and when the user asks for reduced motion: a row of icons swelling and
 * shoving each other as the cursor passes is exactly the unrequested, interaction-triggered motion
 * that setting exists to suppress, and the hover affordance the host stylesheet paints is a
 * discrete state change that survives on its own. Both queries are watched live.
 */
@Directive({
  selector: '[symphonyPointerMagnification]',
  exportAs: 'symphonyPointerMagnification',
})
export class PointerMagnificationDirective {
  // #region Fields

  /**
   * The item selector: which children magnify. Everything else with a box is displaced only.
   *
   * @public
   * @readonly
   */
  public readonly itemSelector = input('*', { alias: 'symphonyPointerMagnification' });

  /**
   * The scale a cell reaches when the pointer sits on its centre.
   *
   * @public
   * @readonly
   */
  public readonly maxScale = input(1.35, {
    alias: 'magnificationMaxScale',
    transform: numberAttribute,
  });

  /**
   * The main-axis reach of the field in pixels. Best kept at a whole or half multiple of the cell
   * pitch, where the row's total growth stops rippling as the pointer sweeps.
   *
   * @public
   * @readonly
   */
  public readonly radius = input(96, { alias: 'magnificationRadius', transform: numberAttribute });

  /**
   * The cross-axis approach band in pixels: how far out the field starts fading in. This is the
   * whole enter and leave animation, so it should be wide enough to be crossed over several frames.
   *
   * @public
   * @readonly
   */
  public readonly approach = input(48, {
    alias: 'magnificationApproach',
    transform: numberAttribute,
  });

  /**
   * The axis the track runs along.
   *
   * @public
   * @readonly
   */
  public readonly axis = input<MagnificationAxis>('horizontal', { alias: 'magnificationAxis' });

  /**
   * Whether the effect is switched off.
   *
   * @public
   * @readonly
   */
  public readonly disabled = input(false, {
    alias: 'magnificationDisabled',
    transform: booleanAttribute,
  });

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly _renderer = inject(Renderer2);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _pointerQuery = globalThis.matchMedia?.('(hover: hover) and (pointer: fine)');
  private readonly _motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  private readonly _hasFinePointer = signal(this._pointerQuery?.matches ?? false);
  private readonly _prefersReducedMotion = signal(this._motionQuery?.matches ?? false);
  private _cleanups: Array<() => void> = [];
  private _elements: readonly HTMLElement[] = [];
  private _geometry: readonly IMagnificationCell[] = [];
  private _axis: MagnificationAxis = 'horizontal';
  private _selector = '*';
  private _maxScale = 1;
  private _radius = 0;
  private _approach = 0;
  private _pointerMain = 0;
  private _pointerCross = 0;
  private _crossStart = Number.NaN;
  private _crossEnd = Number.NaN;
  private _engaged = false;
  private _frame: number | undefined = undefined;

  // #endregion

  // #region Ctor

  public constructor() {
    this.watch(this._pointerQuery, this._hasFinePointer);
    this.watch(this._motionQuery, this._prefersReducedMotion);
    effect(() => this.rebind());
    this._destroyRef.onDestroy(() => this.unbind());
  }

  // #endregion

  // #region Methods

  private watch(query: MediaQueryList | undefined, state: WritableSignal<boolean>): void {
    if (!query) return;
    const listener = (): void => state.set(query.matches);
    query.addEventListener('change', listener);
    this._destroyRef.onDestroy(() => query.removeEventListener('change', listener));
  }

  /**
   * Snapshots every input into plain fields - the pointer path must not read signals - and attaches
   * or detaches the listeners. Runs at human frequency: an input change, or the user turning
   * reduced motion or their pointing device over.
   */
  private rebind(): void {
    this.unbind();
    this._axis = this.axis();
    this._selector = this.itemSelector();
    this._maxScale = Math.max(1, this.maxScale());
    this._radius = Math.max(0, this.radius());
    this._approach = Math.max(0, this.approach());
    const usable =
      !this.disabled() &&
      this._hasFinePointer() &&
      !this._prefersReducedMotion() &&
      this._maxScale > 1 &&
      this._radius > 0 &&
      typeof globalThis.requestAnimationFrame === 'function';
    if (!usable) return;

    // The pointer is followed on the document rather than on the track, so the field can fade in
    // while the pointer is still approaching. A track-scoped listener would have to snap the
    // magnification on at the boundary instead.
    this._cleanups = [
      this._renderer.listen('document', 'pointermove', (event: PointerEvent) => this.track(event), {
        passive: true,
      }),
      this._renderer.listen(
        'document',
        'pointerout',
        (event: PointerEvent) => {
          if (event.relatedTarget === null) this.reset();
        },
        { passive: true },
      ),
      this._renderer.listen('document', 'pointercancel', () => this.reset(), { passive: true }),
      this._renderer.listen('window', 'resize', () => this.invalidate(), { passive: true }),
    ];
  }

  private track(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const horizontal = this._axis === 'horizontal';
    this._pointerMain = horizontal ? event.clientX : event.clientY;
    this._pointerCross = horizontal ? event.clientY : event.clientX;
    // Far from the track and already at rest: the overwhelming majority of pointer moves end here,
    // in a handful of arithmetic operations and no frame.
    if (!this._engaged && this.amplitude() <= 0) return;
    this._frame ??= globalThis.requestAnimationFrame(() => this.render());
  }

  private render(): void {
    this._frame = undefined;
    if (!this._engaged) {
      if (this.amplitude() <= 0) return;
      // Measured here and only here: at the moment the field engages every cell is still at rest,
      // so the rects are the resting rects. Reading them again while magnified would feed the
      // effect's own output back into its input.
      this.measure();
      this._engaged = true;
    }
    const amplitude = this.amplitude();
    if (amplitude <= 0) {
      this.reset();
      return;
    }
    const horizontal = this._axis === 'horizontal';
    const placements = magnificationPlacements(
      this._geometry,
      this._pointerMain,
      this._radius,
      amplitude,
    );
    for (const [index, placement] of placements.entries()) {
      const element = this._elements.at(index);
      if (!element) continue;
      const offset = placement.offset.toFixed(2);
      const scale = placement.scale.toFixed(4);
      this._renderer.setStyle(
        element,
        'transform',
        horizontal
          ? `translate3d(${offset}px, 0, 0) scale(${scale})`
          : `translate3d(0, ${offset}px, 0) scale(${scale})`,
      );
      // Cells overlap their neighbours' resting boxes once they grow, and paint order is document
      // order, so without this the magnified cell is drawn underneath the one after it.
      this._renderer.setStyle(element, 'z-index', `${Math.round((placement.scale - 1) * 1000)}`);
    }
  }

  private measure(): void {
    const horizontal = this._axis === 'horizontal';
    this.measureBand();
    const measured: IMeasuredCell[] = [];
    for (const child of Array.from(this._host.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const rect = child.getBoundingClientRect();
      const extent = horizontal ? rect.width : rect.height;
      if (extent <= 0) continue;
      measured.push({
        element: child,
        cell: {
          centre: horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2,
          extent,
          maxScale: child.matches(this._selector) ? this._maxScale : 1,
        },
      });
    }
    // Visual order, not document order: the track may be reversed or right-to-left.
    measured.sort((left, right) => left.cell.centre - right.cell.centre);
    this._elements = measured.map((entry) => entry.element);
    this._geometry = measured.map((entry) => entry.cell);
    for (const element of this._elements)
      this._renderer.setStyle(element, 'will-change', 'transform');
  }

  /** The track's cross-axis band. Safe to read at any time: no transform is written to the host. */
  private measureBand(): void {
    const bounds = this._host.getBoundingClientRect();
    const horizontal = this._axis === 'horizontal';
    this._crossStart = horizontal ? bounds.top : bounds.left;
    this._crossEnd = horizontal ? bounds.bottom : bounds.right;
  }

  private amplitude(): number {
    if (Number.isNaN(this._crossStart)) this.measureBand();
    const distance = Math.max(
      this._crossStart - this._pointerCross,
      this._pointerCross - this._crossEnd,
      0,
    );
    return magnificationFalloff(distance, this._approach);
  }

  private invalidate(): void {
    if (this._engaged) return;
    this._crossStart = Number.NaN;
  }

  private reset(): void {
    if (this._frame !== undefined) {
      globalThis.cancelAnimationFrame(this._frame);
      this._frame = undefined;
    }
    if (!this._engaged) return;
    for (const element of this._elements) {
      this._renderer.removeStyle(element, 'transform');
      this._renderer.removeStyle(element, 'z-index');
      this._renderer.removeStyle(element, 'will-change');
    }
    this._engaged = false;
    // The track may have moved while the pointer was away; re-read the band on the next approach.
    this._crossStart = Number.NaN;
  }

  private unbind(): void {
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this.reset();
    this._elements = [];
    this._geometry = [];
  }

  // #endregion
}
