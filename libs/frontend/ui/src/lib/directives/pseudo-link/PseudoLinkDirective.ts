// #region Imports

import { Directive, ElementRef, inject, OnInit, Renderer2 } from '@angular/core';

// #endregion

/**
 * Removes the user-agent link styling from an anchor that wraps composed Mosaik content
 * (brand, cards, cells) while keeping every link capability: routing, href, context menu,
 * middle-click, and keyboard activation. Mirrors the FLAMOX365 `flamoxPseudoLink` directive.
 * Text-only hyperlinks use `mosaik-anchor` instead.
 *
 * @example
 * ```html
 * <a symphonyPseudoLink [routerLink]="['/tickets', ticket.id]">
 *   <mosaik-card>…</mosaik-card>
 * </a>
 * ```
 */
@Directive({
  selector: 'a[symphonyPseudoLink]',
  exportAs: 'symphonyPseudoLink',
})
export class PseudoLinkDirective implements OnInit {
  // #region Fields

  private readonly _renderer = inject(Renderer2);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // #endregion

  // #region Methods

  /**
   * Angular lifecycle hook invoked on init.
   *
   * @public
   */
  public ngOnInit(): void {
    this._renderer.setStyle(this._host, 'color', 'inherit');
    this._renderer.setStyle(this._host, 'text-decoration', 'none');
    this._renderer.setStyle(this._host, 'cursor', 'pointer');
  }

  // #endregion
}
