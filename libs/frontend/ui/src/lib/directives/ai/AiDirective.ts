// #region Imports

import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  RendererStyleFlags2,
} from '@angular/core';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';

// #endregion

interface IInlineStyleState {
  readonly value: string;
  readonly priority: string;
}

@Directive({ selector: '[aiEnhanced]', exportAs: 'aiEnhanced' })
export class AiDirective {
  // #region Fields

  private static readonly _borderProperties = [
    '--textbox-border-color',
    '--select-border-color',
  ] as const;

  /**
   * The AI enhanced.
   *
   * @public
   * @readonly
   */
  public readonly aiEnhanced = input(true, { transform: booleanAttribute });

  /**
   * The AI enabled.
   *
   * @public
   * @readonly
   */
  public readonly aiEnabled = input(true, { transform: booleanAttribute });

  /**
   * The AI variant.
   *
   * @public
   * @readonly
   */
  public readonly aiVariant = input<Variant>('highlight');

  /**
   * The AI border color.
   *
   * @public
   * @readonly
   */
  public readonly aiBorderColor = input('var(--mosaik-color-highlight-500)');
  private readonly _element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly _renderer = inject(Renderer2);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _initialBorderColors = new Map<string, IInlineStyleState>();
  private _initialVariant: string | null = null;
  private _ownsPresentation = false;

  // #endregion

  // #region Ctor

  public constructor() {
    effect(() => {
      if (!this.aiEnhanced() || !this.aiEnabled()) {
        this.restore();
        return;
      }
      this.apply(this.aiVariant(), this.aiBorderColor());
    });
    this._destroyRef.onDestroy(() => this.restore());
  }

  // #endregion

  // #region Methods

  private apply(variant: Variant, borderColor: string): void {
    if (!this._ownsPresentation) {
      this._initialVariant = this._element.getAttribute('variant');
      for (const property of AiDirective._borderProperties) {
        this._initialBorderColors.set(property, {
          value: this._element.style.getPropertyValue(property),
          priority: this._element.style.getPropertyPriority(property),
        });
      }
      this._ownsPresentation = true;
    }
    this._renderer.setAttribute(this._element, 'variant', variant);
    for (const property of AiDirective._borderProperties) {
      this._renderer.setStyle(this._element, property, borderColor, RendererStyleFlags2.DashCase);
    }
  }

  private restore(): void {
    if (!this._ownsPresentation) return;
    if (this._initialVariant === null) this._renderer.removeAttribute(this._element, 'variant');
    else this._renderer.setAttribute(this._element, 'variant', this._initialVariant);
    for (const property of AiDirective._borderProperties) {
      const initial = this._initialBorderColors.get(property);
      if (!initial?.value) {
        this._renderer.removeStyle(this._element, property, RendererStyleFlags2.DashCase);
        continue;
      }
      let flags = RendererStyleFlags2.DashCase;
      if (initial.priority === 'important') flags |= RendererStyleFlags2.Important;
      this._renderer.setStyle(this._element, property, initial.value, flags);
    }
    this._initialBorderColors.clear();
    this._initialVariant = null;
    this._ownsPresentation = false;
  }

  // #endregion
}
