// #region Imports
import {
  upgradeApplicationSettings,
  type IApplicationSettings,
} from '@symphony/configuration-composition';
import { type JsonSettingsRepository } from '@symphony/persistence-platform';
// #endregion

/**
 * Owns the one live settings aggregate and its full persistence writer.
 *
 * @public
 */
export class OrchestratorSettingsState {
  // #region Fields
  private _current: IApplicationSettings;
  private readonly _repository: Pick<
    JsonSettingsRepository,
    'save' | 'load' | 'repositoryPath' | 'hasStoredSettings'
  >;
  // #endregion
  // #region Ctor
  /**
   * Adopts the already loaded aggregate without performing another disk read.
   *
   * @public
   */
  public constructor(
    repository: Pick<
      JsonSettingsRepository,
      'save' | 'load' | 'repositoryPath' | 'hasStoredSettings'
    >,
    current: IApplicationSettings,
  ) {
    this._repository = repository;
    this._current = current;
  }
  // #endregion
  // #region Properties
  /**
   * Reads the current aggregate, including transient guarded changes.
   *
   * @public
   */
  public get current(): IApplicationSettings {
    return this._current;
  }
  /**
   * Replaces the live aggregate without introducing a second backing state.
   *
   * @public
   */
  public set current(value: IApplicationSettings) {
    this._current = value;
  }
  // #endregion
  // #region Methods
  /**
   * Persists the complete aggregate; the owning use case controls its follow-up effects.
   *
   * @public
   */
  public save(value: IApplicationSettings): IApplicationSettings {
    return this._repository.save(value);
  }
  /**
   * Refreshes the same backing state using the existing upgrade path.
   *
   * @public
   */
  public refresh(): void {
    this._current = upgradeApplicationSettings(this._repository.load(this._current));
  }
  /**
   * Reads the existing machine-local path used by workspace import planning.
   *
   * @public
   */
  public repositoryPath(repositoryBindingId: string): string {
    return this._repository.repositoryPath(repositoryBindingId);
  }
  /**
   * Reports whether initialization must persist the generated defaults.
   *
   * @public
   */
  public hasStoredSettings(): boolean {
    return this._repository.hasStoredSettings();
  }
  // #endregion
}
