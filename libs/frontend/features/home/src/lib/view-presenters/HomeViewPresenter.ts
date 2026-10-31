// #region Imports

import { inject, Injectable } from '@angular/core';
import { ViewPresenter } from '@symphony/frontend-core';
import { HOME_CONTEXT } from '../ports/HomeContextToken';

// #endregion

@Injectable()
export class HomeViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _context = inject(HOME_CONTEXT);

  // #endregion

  // #region Properties

  /** The existing loading state for the panorama's fixed skeleton geometry. @public @readonly */
  public readonly hasSnapshot = this._context.hasSnapshot;

  /** The first confirmed upstream incident with operator-relevant impact. @public @readonly */
  public readonly externalServiceIncident = this._context.externalServiceIncident;

  // #endregion
}
