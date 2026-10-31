// #region Imports

import { inject, Injectable } from '@angular/core';
import { Command, ViewPresenter } from '@symphony/frontend-core';
import { CI_SETTINGS_CONFIGURATION } from '../ports/CiSettingsConfigurationToken';
import { CI_SETTINGS_CONTEXT } from '../ports/CiSettingsContextToken';
import { CiSettingsViewPresenter } from './CiSettingsViewPresenter';

// #endregion

/**
 * Applies the virtual-machine settings of System as soon as they change: the resource preset and
 * warm reuse on change, the custom resources when a slider is released. A failed save shows the
 * stored machine specification again.
 *
 * @public
 */
@Injectable()
export class VirtualMachinesCardViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(CI_SETTINGS_CONTEXT);
  private readonly _configuration = inject(CI_SETTINGS_CONFIGURATION);
  private _saving: Promise<void> = Promise.resolve();

  /**
   * The CI settings projections and drafts this card shares with Local GitHub Actions.
   *
   * @public
   * @readonly
   */
  public readonly ci = inject(CiSettingsViewPresenter);

  /**
   * Chooses a resource preset and saves it.
   *
   * @public
   * @readonly
   */
  public readonly setResourcePresetCommand = new Command<unknown>((event) => {
    this.ci.updateLocalCiResourcePresetCommand.execute(event);
    this.save();
  });

  /**
   * Keeps machines warm between runs, or not, and saves it.
   *
   * @public
   * @readonly
   */
  public readonly setReuseCommand = new Command<boolean>((enabled) => {
    if (this.ci.localCi().reuseVirtualMachine === enabled) return;
    this.ci.updateLocalCiReuseCommand.execute(enabled);
    this.save();
  });

  /**
   * Saves the custom resources once a slider is released.
   *
   * @public
   * @readonly
   */
  public readonly commitCustomResourcesCommand = new Command<void>(() => this.save());

  // #endregion

  // #region Methods

  /**
   * Starts the shared CI presenter's hydration with this card.
   *
   * @public
   * @inheritdoc
   */
  public override initialize(): void {
    super.initialize();
    this.ci.initialize();
  }

  /**
   * Releases the shared CI presenter with this card.
   *
   * @public
   * @inheritdoc
   */
  public override dispose(): void {
    this.ci.dispose();
    super.dispose();
  }

  /** Saves the machine specification after any save still in flight. */
  private save(): void {
    this._saving = this._saving.then(async () => {
      const current = this._context.settings();
      if (!current) return;
      const localCi = this.ci.localCi();
      if (JSON.stringify(localCi) === JSON.stringify(current.localCi)) return;
      const saved = await this._configuration.saveSettings({ ...current, localCi });
      if (!saved) this.ci.localCi.set({ ...current.localCi });
    });
  }

  // #endregion
}
