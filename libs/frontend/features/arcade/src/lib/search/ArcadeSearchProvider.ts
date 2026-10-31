// #region Imports

import { Inject, Injectable, Optional } from '@angular/core';
import type { IPaletteResult, ISearchProvider } from '@symphony/frontend-search';
import { ARCADE_SETTINGS_CONTEXT } from '../settings/ArcadeSettingsContextToken';
import type { IArcadeSettingsContext } from '../settings/IArcadeSettingsContext';
import { projectArcadePaletteResults } from './projectArcadePaletteResults';

// #endregion

/**
 * Contributes Arcade's two existing global route phrases and the command palette's `Play` commands.
 *
 * @public
 */
@Injectable()
export class ArcadeSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _settings: Pick<IArcadeSettingsContext, 'enabled'> | null;

  // #endregion

  // #region Ctor

  /** Connects the Arcade preference that decides whether games are offered. @public */
  public constructor(
    @Inject(ARCADE_SETTINGS_CONTEXT)
    @Optional()
    settings: Pick<IArcadeSettingsContext, 'enabled'> | null = null,
  ) {
    this._settings = settings;
  }

  // #endregion

  // #region Properties

  /** Stable Arcade search provider identity. @public @readonly */
  public readonly id = 'arcade.search';
  /** Arcade supplies route aliases without a data-query phase. @public @readonly */
  public readonly order = 50;
  /** Existing Arcade aliases follow the Skills alias. @public @readonly */
  public readonly aliases = [
    { term: 'arcade', path: '/main/arcade', order: 7 },
    { term: 'pinball', path: '/main/arcade', order: 8 },
  ];

  // #endregion

  // #region Methods

  /**
   * Lists `Play <game>` for the matching games while the Arcade is switched on.
   *
   * @param _query - Trimmed palette input; matching uses the normalized form.
   * @param normalizedQuery - Locale-lowercased palette input.
   * @returns Arcade's palette rows.
   * @public
   */
  public paletteResults(_query: string, normalizedQuery: string): readonly IPaletteResult[] {
    return projectArcadePaletteResults(this._settings?.enabled() ?? false, normalizedQuery);
  }

  // #endregion
}
