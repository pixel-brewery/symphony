// #region Imports

import { inject, Injectable } from '@angular/core';
import { ViewPresenter } from '@symphony/frontend-core';
import { DesktopPowerStore } from '../state/DesktopPowerStore';

// #endregion

/**
 * Connects the existing Sleep card to the single native power-state owner.
 *
 * @public
 */
@Injectable()
export class PowerSettingsCardViewPresenter extends ViewPresenter {
  // #region Properties

  /** The existing native power settings and operations. @public @readonly */
  public readonly power = inject(DesktopPowerStore);

  // #endregion

  // #region Methods

  /**
   * Reads power settings when their owning Settings card mounts.
   *
   * @public
   * @inheritdoc
   */
  public override initialize(): void {
    super.initialize();
    if (!this.power.state()) void this.power.initialize();
  }

  // #endregion
}
