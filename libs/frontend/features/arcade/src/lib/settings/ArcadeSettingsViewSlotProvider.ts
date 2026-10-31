// #region Imports

import { Injectable } from '@angular/core';
import type {
  IViewSlotDefinition,
  IViewSlotProvider,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { ArcadeGameIds } from '../games/ArcadeGameIds';

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
  public getViews(): Array<
    IViewSlotDefinition & { readonly search: readonly ISettingsSearchEntry[] }
  > {
    return [
      {
        id: 'arcade-settings',
        order: 100,
        // Read by Search settings, which lists Appearance's contributed cards too.
        search: [
          {
            id: 'show-arcade',
            label: 'Show Arcade',
            description: `Add all ${ArcadeGameIds.length} bundled games to the main navigation.`,
            group: 'Navigation',
            keywords: ['games', 'arcade'],
            loadControl: () =>
              import('./ArcadeEnabledToggleView').then((module) => module.ArcadeEnabledToggleView),
          },
          {
            id: 'god-mode',
            label: 'God mode',
            description:
              'Press the keys in order. Progress resets after two seconds without a key.',
            group: 'Navigation',
          },
        ],
        loadComponent: () =>
          import('./ArcadeSettingsCardView').then((module) => module.ArcadeSettingsCardView),
      },
    ];
  }

  // #endregion
}
