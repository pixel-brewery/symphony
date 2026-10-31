// #region Imports

import type { ICollectionListMenuOption } from './ICollectionListMenuOption';

// #endregion

export interface ICollectionListMenu {
  readonly id: string;
  readonly label: string;
  readonly options: readonly ICollectionListMenuOption[];
  readonly subLabel?: string;
  readonly testId?: string;
}
