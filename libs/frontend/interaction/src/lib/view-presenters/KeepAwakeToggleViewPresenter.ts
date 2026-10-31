// #region Imports

import { inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { createImmediateSetting } from '@symphony/frontend-setting';
import { DesktopPowerStore } from '../state/DesktopPowerStore';

// #endregion

/**
 * Applies `Keep this Mac awake while tasks run` as soon as the switch changes and restores the
 * switch when the change fails.
 *
 * @public
 */
@Injectable()
export class KeepAwakeToggleViewPresenter extends ViewPresenter {
  // #region Fields

  /** The native power settings and operations. @public @readonly */
  public readonly power = inject(DesktopPowerStore);

  /**
   * The switch's value.
   *
   * @public
   * @readonly
   */
  public readonly keepAwake = createImmediateSetting(
    () => this.power.state()?.keepAwakeWhileBusy ?? false,
  );

  /**
   * Applies a new value.
   *
   * @public
   * @readonly
   */
  public readonly setKeepAwakeCommand = new Command<boolean>((enabled) => {
    void this.keepAwake.apply(enabled, async (next) => {
      await this.power.setKeepAwakeWhileBusy(next);
      return this.power.state()?.keepAwakeWhileBusy === next;
    });
  });

  // #endregion

  // #region Methods

  /**
   * Reads power settings when the switch mounts.
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
