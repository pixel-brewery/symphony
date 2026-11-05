// #region Imports

import { Injectable } from '@angular/core';
import type {
  IViewSlotDefinition,
  IViewSlotProvider,
} from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsSearchEntry } from '@symphony/frontend-setting';
import { ArcadeGameIds } from '../games/ArcadeGameIds';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
            get label() {
              return translateLabel('loc.symphony.labels.show.arcade.b48bb78');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.add.all.bundled.games.to.the.main.navigation.19e1239',
                ArcadeGameIds.length,
              );
            },
            get group() {
              return translateLabel('loc.symphony.labels.navigation.3db65f8');
            },
            keywords: ['games', 'arcade'],
            loadControl: () =>
              import('./ArcadeEnabledToggleView').then((module) => module.ArcadeEnabledToggleView),
          },
          {
            id: 'god-mode',
            get label() {
              return translateLabel('loc.symphony.labels.god.mode.c2a056f');
            },
            get description() {
              return translateLabel(
                'loc.symphony.labels.press.the.keys.in.order.progress.resets.after.two.se.d216387',
              );
            },
            get group() {
              return translateLabel('loc.symphony.labels.navigation.3db65f8');
            },
          },
        ],
        loadComponent: () =>
          import('./ArcadeSettingsCardView').then((module) => module.ArcadeSettingsCardView),
      },
    ];
  }

  // #endregion
}
