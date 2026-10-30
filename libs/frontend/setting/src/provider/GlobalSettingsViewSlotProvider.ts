// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import type { IViewSlotProvider } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import type { ISettingsSelection } from '../models/ISettingsSelection';
import type { ISettingsViewContribution } from '../models/ISettingsViewContribution';
import type { ISettingsViewDefinition } from '../models/ISettingsViewDefinition';
import { collectSettingsViews } from './collectSettingsViews';
import { SETTINGS_VIEW_CONTRIBUTIONS } from './SettingsViewContributionsToken';

// #endregion

/**
 * Supplies included global cards to Mosaik's existing registry.
 *
 * @public
 */
@Injectable()
export class GlobalSettingsViewSlotProvider implements IViewSlotProvider<ISettingsSelection> {
  // #region Fields

  private readonly _contributions: readonly ISettingsViewContribution[];

  // #endregion

  // #region Ctor

  /**
   * Captures the explicitly included feature contributions.
   *
   * @public
   */
  public constructor(
    @Inject(SETTINGS_VIEW_CONTRIBUTIONS)
    @Optional()
    contributions: readonly ISettingsViewContribution[] | null = inject(
      SETTINGS_VIEW_CONTRIBUTIONS,
      { optional: true },
    ),
  ) {
    this._contributions = contributions ?? [];
  }

  // #endregion

  // #region Methods

  /**
   * Resolves configured views while retaining native sorting and activation.
   *
   * @public
   */
  public getViews(): ISettingsViewDefinition[] {
    return collectSettingsViews(this._contributions, SettingsViewSlot.Global);
  }

  // #endregion
}
