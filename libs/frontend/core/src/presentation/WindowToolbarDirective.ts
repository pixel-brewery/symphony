// #region Imports

import { DestroyRef, Directive, effect, inject, input, TemplateRef } from '@angular/core';
import { WindowToolbar } from './WindowToolbar';

// #endregion

/**
 * Hands a screen's title, subtitle and contextual actions to the window's unified toolbar.
 *
 * Place it on an `ng-template` in the screen's own template; the template content becomes the
 * toolbar actions and keeps the screen's bindings, because it is declared there:
 *
 * ```html
 * <ng-template symphonyWindowToolbar [toolbarTitle]="'Board'" [toolbarSubtitle]="subtitle">
 *   <mosaik-button [label]="'New work item'" … />
 * </ng-template>
 * ```
 *
 * @public
 */
@Directive({
  selector: 'ng-template[symphonyWindowToolbar]',
  standalone: true,
})
export class WindowToolbarDirective {
  // #region Fields

  private readonly _toolbar = inject(WindowToolbar);
  private readonly _template = inject<TemplateRef<unknown>>(TemplateRef);

  // #endregion

  // #region Ctor

  /**
   * Keeps the registration current while the screen lives.
   *
   * @public
   */
  public constructor() {
    effect(() => {
      this._toolbar.register(
        this,
        this.toolbarTitle(),
        this.toolbarSubtitle(),
        this.toolbarActions() ? this._template : undefined,
      );
    });
    inject(DestroyRef).onDestroy(() => this._toolbar.unregister(this));
  }

  // #endregion

  // #region Properties

  /**
   * Screen title shown in the toolbar.
   *
   * @public
   * @readonly
   */
  public readonly toolbarTitle = input.required<string>();

  /**
   * One-line subtitle shown below the title.
   *
   * @public
   * @readonly
   */
  public readonly toolbarSubtitle = input<string>('');

  /**
   * Whether the template content is rendered as toolbar actions.
   *
   * @public
   * @readonly
   */
  public readonly toolbarActions = input<boolean>(true);

  // #endregion
}
