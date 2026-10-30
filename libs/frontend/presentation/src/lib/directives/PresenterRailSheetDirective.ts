// #region Imports

import { afterNextRender, Directive, inject } from '@angular/core';
import { SheetComponent } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * Opens the responsive workspace-rail sheet after the Mosaik element has connected.
 *
 * @public
 */
@Directive({
  selector: 'mosaik-sheet[symphonyPresenterRailSheet]',
})
export class PresenterRailSheetDirective {
  // #region Fields

  private readonly _sheet = inject(SheetComponent);

  // #endregion

  // #region Ctor

  /** @public */
  public constructor() {
    afterNextRender(() => {
      const element = this._sheet.elementRef.nativeElement;

      void element.updateComplete.then(() => this._sheet.invoke('open'));
    });
  }

  // #endregion
}
