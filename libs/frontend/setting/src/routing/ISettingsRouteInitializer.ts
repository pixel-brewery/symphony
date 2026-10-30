// #region Imports

import type { ISettingsRouteContext } from './ISettingsRouteContext';

// #endregion

/** Static Settings lifecycle contribution owned by one selected feature. @public */
export interface ISettingsRouteInitializer {
  /** Unique contribution identity checked before route effects are created. @public @readonly */
  readonly id: string;
  /** Runs once in the actual route injection context, so native Angular effects share its lifetime. @public @readonly */
  readonly initialize: (context: ISettingsRouteContext) => void;
}
