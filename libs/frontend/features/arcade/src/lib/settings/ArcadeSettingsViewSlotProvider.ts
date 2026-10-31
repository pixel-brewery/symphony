// #region Imports

import { Injectable } from '@angular/core';
import type {
  IViewSlotDefinition,
  IViewSlotProvider,
} from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * Supplies Arcade's settings card through the existing Mosaik slot contract.
 *
 * @public
 */
@Injectable()
export class ArcadeSettingsViewSlotProvider implements IViewSlotProvider {
  // #region Methods

  /**
   * Gets the independently lazy-loaded Arcade card.
   *
   * @returns The Arcade settings contribution.
   * @public
   */
  public getViews(): Array<IViewSlotDefinition> {
    return [
      {
        id: 'arcade-settings',
        order: 100,
        loadComponent: () =>
          import('./ArcadeSettingsCardView').then((module) => module.ArcadeSettingsCardView),
      },
    ];
  }

  // #endregion
}
