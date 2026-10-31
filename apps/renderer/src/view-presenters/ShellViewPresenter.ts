// #region Imports

import { inject, Injectable, Injector, signal } from '@angular/core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';

// #endregion

@Injectable()
export class ShellViewPresenter {
  // #region Fields

  private readonly _injector = inject(Injector);
  private readonly _isHydrating = signal(!window.location.hash.startsWith('#/menu-bar'));

  /**
   * Whether the main application is still completing its initial workspace hydration.
   *
   * @public
   * @readonly
   */
  public readonly isHydrating = this._isHydrating.asReadonly();

  // #endregion

  // #region Ctor

  /** @public */
  public constructor() {
    if (!this._isHydrating()) return;
    void this.hydrate();
  }

  // #endregion

  // #region Methods

  private async hydrate(): Promise<void> {
    try {
      await this._injector.get(ApplicationBootstrap).initialize();
    } catch (error: unknown) {
      console.error('Symphony could not complete its startup hydration.', error);
    } finally {
      this._isHydrating.set(false);
    }
  }

  // #endregion
}
