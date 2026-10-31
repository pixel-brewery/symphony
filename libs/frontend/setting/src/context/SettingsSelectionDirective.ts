// #region Imports

import { Directive, Inject, inject, Input, Self } from '@angular/core';
import { ViewSlotOutletComponent } from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsSelection } from '../models/ISettingsSelection';

// #endregion

/**
 * Applies generic Settings selection through Mosaik's public outlet contract.
 *
 * @public
 */
@Directive({
  selector: 'mosaik-view-slot-outlet[symphonySettingsSelection]',
})
export class SettingsSelectionDirective<
  TSelection extends ISettingsSelection = ISettingsSelection,
> {
  // #region Fields

  private readonly _outlet: ViewSlotOutletComponent;

  // #endregion

  // #region Ctor

  /**
   * Connects the directive to the existing outlet.
   *
   * @public
   */
  public constructor(
    @Inject(ViewSlotOutletComponent)
    @Self()
    outlet: ViewSlotOutletComponent = inject(ViewSlotOutletComponent, { self: true }),
  ) {
    this._outlet = outlet;
  }

  // #endregion

  // #region Properties

  /**
   * Receives the selected section through Angular's public input metadata.
   *
   * @public
   */
  @Input('symphonySettingsSelection')
  public set selection(selection: TSelection | null) {
    this._outlet.setSelection(selection);
  }

  // #endregion
}
